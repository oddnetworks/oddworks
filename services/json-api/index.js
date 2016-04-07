'use strict';

const _ = require('lodash');
const boom = require('boom');
const Promise = require('bluebird');

const service = exports = module.exports = {};
let config = {};

const jsonAPIKeys = ['id', 'type', 'relationships', 'meta', 'links'];

service.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	config.bus.queryHandler({role: 'json-api', cmd: 'included'}, payload => {
		return new Promise((resolve, reject) => {
			let include = payload.include.split(',');
			include = _(include)
				.map(relationship => {
					if (!payload.object.relationships[relationship]) {
						reject(new Error(`relationships.${relationship} does not exist on object '${payload.object.id}'`));
					}
					return payload.object.relationships[relationship].data;
				})
				.compact()
				.value();

			Promise.map(include, object => {
				return config.bus.query({role: 'catalog', cmd: 'fetch'}, object);
			})
			.then(objects => {
				resolve(objects);
			})
			.catch(err => {
				reject(err);
			});
		});
	});

	return Promise.resolve(true);
};

service.middleware = (bus, options) => {
	return (req, res, next) => {
		if (_.isEmpty(res.body)) {
			return next(boom.notFound());
		}

		const baseUrl = `${req.protocol}://${req.get('host')}`;

		let data = _.cloneDeep(res.body);
		res.body = {};

		if (_.isArray(data)) {
			data = _.map(data, object => {
				return serialize(object, baseUrl);
			});
		} else {
			data = serialize(data, baseUrl);
		}
		res.body.data = data;
		res.body.links = {
			self: `${baseUrl}${req.originalUrl}`
		};
		res.body.meta = {
			network: req.identity.network.id,
			device: req.identity.device.deviceType
		};

		if (!_.isArray(data) && _.isString(req.query.include)) {
			res.body.included = [];
			config.bus.query({role: 'json-api', cmd: 'included'}, {object: res.body.data, include: req.query.include})
				.then(included => {
					res.body.included = included;
					next();
				})
				.catch(err => {
					next(boom.badRequest(err.message));
				});
		} else {
			next();
		}
	};
};

function serialize(object, baseUrl) {
	const attributes = _.omit(object, jsonAPIKeys);

	_.forOwn(attributes, (value, key) => {
		delete object[key];
	});

	object.attributes = _.cloneDeep(attributes);
	if (object.id && object.type) {
		object.relationships = object.relationships || {};
		object.links = {
			self: `${baseUrl}/${object.type}s/${object.id}`
		};
		object.meta = object.meta || {};
	}

	return object;
}

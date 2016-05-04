'use strict';

const _ = require('lodash');
const boom = require('boom');
const Promise = require('bluebird');

const utils = require('./utils');

const service = exports = module.exports = {};
let config = {};

service.name = 'json-api';

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
				.flatten()
				.compact()
				.value();

			Promise
				.map(include, resource => {
					return config.bus
						.query({role: 'catalog', cmd: 'fetch'}, resource)
						.then(resource => config.bus.query({role: 'json-api', cmd: 'format'}, {resource}));
				})
				.then(resources => resolve(resources))
				.catch(err => reject(err));
		});
	});

	config.bus.queryHandler({role: 'json-api', cmd: 'validate'}, payload => {
		const keyPaths = ['data', 'data.id', 'data.type', 'data.attributes'];

		return new Promise((resolve, reject) => {
			keyPaths.forEach(path => {
				if (!_.has(payload, path)) {
					return reject(new Error(`payload missing ${path}`));
				}
			});

			resolve(true);
		});
	});

	config.bus.queryHandler({role: 'json-api', cmd: 'format'}, payload => {
		return new Promise(resolve => resolve(utils.format(payload.resource, payload.baseUrl)));
	});

	config.bus.queryHandler({role: 'json-api', cmd: 'deformat'}, payload => {
		return new Promise(resolve => resolve(utils.deformat(payload.resource)));
	});

	return Promise.resolve(true);
};

service.middleware = { // eslint-disable-line
	formatter(options) {
		return (req, res, next) => {
			if (_.isEmpty(res.body)) {
				return next(boom.notFound());
			}

			const baseUrl = `${req.protocol}://${req.get('host')}`;

			let data = _.cloneDeep(res.body);
			res.body = {};

			if (_.isArray(data)) {
				data = _.map(data, object => {
					return utils.format(object, baseUrl);
				});
			} else {
				data = utils.format(data, baseUrl);
			}

			res.body.data = data;
			res.body.links = {
				self: `${baseUrl}${req.originalUrl}`
			};
			res.body.meta = {
				channel: req.identity.channel.id,
				platform: req.identity.platform.platformType
			};

			if (!_.isArray(data) && _.isString(req.query.include)) {
				res.body.included = [];
				config.bus.query({role: 'json-api', cmd: 'included'}, {object: res.body.data, include: req.query.include, baseUrl})
					.then(included => {
						res.body.included = included;
						next();
					})
					.catch(err => next(boom.badRequest(err.message)));
			} else {
				next();
			}
		};
	},

	deformatter(options) {
		return (req, res, next) => {
			if (_.includes(['POST', 'PUT', 'PATCH'], req.method)) {
				config.bus.query({role: 'json-api', cmd: 'validate'}, req.body)
					.then(() => {
						req.body = utils.deformat(req.body);

						next();
					})
					.catch(err => next(boom.badRequest(err.message)));
			} else {
				next();
			}
		};
	}
};

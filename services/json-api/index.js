'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const service = exports = module.exports = {};
let config = {};

const jsonAPIKeys = ['id', 'type', 'relationships', 'meta', 'links'];

service.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	return Promise.resolve(true);
};

service.middleware = (bus, options) => {
	return (req, res, next) => {
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
			organization: req.identity.organization.id,
			device: req.identity.device.deviceType
		};

		next();
	};
};

function serialize(object, baseUrl) {
	const attributes = _.omit(object, jsonAPIKeys);

	_.forOwn(attributes, (value, key) => {
		delete object[key];
	});

	object.attributes = _.cloneDeep(attributes);
	object.relationships = object.relationships || {};
	object.links = {
		self: `${baseUrl}/${object.type}s/${object.id}`
	};
	object.meta = object.meta || {};

	return object;
}

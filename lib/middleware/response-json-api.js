'use strict';

const _ = require('lodash');
const Boom = require('boom');

const JSON_API_KEYS = ['id', 'type', 'relationships', 'meta', 'links'];

module.exports = function (options) {
	options = options || {};

	const bus = options.bus;

	if (!bus || !_.isObject(bus)) {
		throw new Error('options.bus is required.');
	}

	function format(resource, baseUrl) {
		const attributes = _.omit(resource, JSON_API_KEYS);

		JSON_API_KEYS.forEach(key => {
			delete resource[key];
		});

		resource.attributes = attributes;
		if (resource.id && resource.type) {
			resource.relationships = resource.relationships || {};
			resource.links = {
				self: `${baseUrl}/${resource.type}s/${resource.id}`
			};
			resource.meta = resource.meta || {};
		}

		return resource;
	}

	function composeIncluded(data, baseUrl) {
		const relationships = data.relationships || {};
		const included = data.included || [];

		// Remove relationship references that were not found.
		Object.keys(relationships).forEach(key => {
			const rel = relationships[key].data || [];
			rel.slice().forEach((item, i) => {
				const foundIndex = _.findIndex(included, {type: item.type, id: item.id});
				if (foundIndex < 0) {
					bus.broadcast({level: 'warn', event: 'json-api-missing-relationship'}, {
						message: `id:${data.id}, key:${key}, fk:${item.id}`
					});
					rel.splice(i, 1);
				}
			});
		});

		if (included.length) {
			return included.map(entity => {
				return format(entity, baseUrl);
			});
		}

		return [];
	}
	return function requestJsonApi(req, res, next) {
		if (_.isEmpty(res.body)) {
			return next(Boom.notFound());
		}

		const baseUrl = `${req.protocol}://${req.hostname}`;

		const data = _.cloneDeep(res.body);
		res.body = {};

		if (_.isArray(data)) {
			res.body.data = _.map(data, object => {
				delete object.included;
				return format(object, baseUrl);
			});
		} else {
			if (_.isString(req.query.include)) {
				res.body.included = composeIncluded(data, baseUrl);
			}
			delete data.included;
			res.body.data = format(data, baseUrl);
		}

		res.body.links = {
			self: `${baseUrl}${req.originalUrl}`
		};
		res.body.meta = {
			channel: req.identity.channel.id,
			platform: req.identity.platform.platformType
		};

		next();
	};
};

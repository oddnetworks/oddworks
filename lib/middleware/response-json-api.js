'use strict';

const _ = require('lodash');
const Boom = require('boom');

const JSON_API_KEYS = ['id', 'type', 'relationships', 'meta', 'links'];

// options.bus - Object *required*
module.exports = function (options) {
	options = options || {};
	const BASE_PREFIX = options.baseUrlPrefix;

	const bus = options.bus;

	if (!bus || !_.isObject(bus)) {
		throw new Error('options.bus is required.');
	}

	function format(data, baseUrl) {
		const resource = {};

		if (data.id && data.type) {
			resource.id = data.id;
			resource.type = data.type;
			resource.attributes = _.omit(data, JSON_API_KEYS);
			resource.relationships = data.relationships || {};
			if (resource.type === 'config') {
				resource.links = {
					self: `${baseUrl}/config`
				};
			} else {
				resource.links = {
					self: `${baseUrl}/${resource.type}s/${resource.id}`
				};
			}
			resource.meta = data.meta || {};
		}

		return resource;
	}

	function composeIncluded(include, data, baseUrl) {
		include = include.split(',');
		const included = _.compact(data.included || []);
		const relationships = data.relationships || {};

		function inIncluded(item, key) {
			const foundIndex = _.findIndex(included, {type: item.type, id: item.id});
			if (foundIndex < 0) {
				bus.broadcast({level: 'warn', event: 'json-api-missing-relationship'}, {
					message: `id:${data.id}, key:${key}, fk:${item.id}`
				});
				return false;
			}
			return included[foundIndex];
		}

		const finalIncluded = Object.keys(relationships).reduce((finalIncluded, key) => {
			// If the request did not ?include= this relationship, don't include it.
			if (include.indexOf(key) < 0) {
				return finalIncluded;
			}

			const rel = relationships[key].data || {};

			// Only include relationships actually referenced.
			// Remove relationship references that were not found.
			if (Array.isArray(rel)) {
				rel.slice().forEach((item, i) => {
					const res = inIncluded(item, key);
					if (res) {
						finalIncluded.push(res);
					} else {
						rel.splice(i, 1);
					}
				});
			} else {
				const res = inIncluded(rel, key);
				if (res) {
					finalIncluded.push(res);
				} else {
					delete relationships[key];
				}
			}

			return finalIncluded;
		}, []);

		if (finalIncluded.length) {
			return finalIncluded.map(entity => {
				return format(entity, baseUrl);
			});
		}

		return [];
	}

	return function responseJsonApi(req, res, next) {
		if (!res.body) {
			return next(Boom.notFound());
		}

		let baseUrl = `${req.protocol}://${req.hostname}`;
		const port = req.socket.address().port || process.env.PORT;

		let defaultPort = false;
		if ((req.protocol === 'http' && port === 80) ||
			(req.protocol === 'https' && port === 443)) {
			defaultPort = true;
		}

		if (!defaultPort && process.env.NODE_ENV && process.env.NODE_ENV.toUpperCase() !== 'PRODUCTION') {
			baseUrl = `${baseUrl}:${port}`;
		}
		if (BASE_PREFIX) {
			baseUrl = `${baseUrl}${BASE_PREFIX}`;
		}

		const data = _.cloneDeep(res.body);
		res.body = {};

		if (_.isArray(data)) {
			res.body.data = data.map(object => {
				delete object.included;
				return format(object, baseUrl);
			});

			let link = `${baseUrl}`;
			if (BASE_PREFIX && req.originalUrl.indexOf(BASE_PREFIX) === 0) {
				// create a suffix that does not have the BASE_PREFIX in it
				const suffix = req.originalUrl.substr(BASE_PREFIX.length, (req.originalUrl.length - BASE_PREFIX.length));
				link += suffix;
			} else {
				link += `${req.originalUrl}`;
			}

			res.body.links = {
				self: link
			};
		} else {
			if (_.isString(req.query.include)) {
				res.body.included = composeIncluded(req.query.include, data, baseUrl);
			}
			delete data.included;
			res.body.data = format(data, baseUrl);
			res.body.links = res.body.data.links;
		}

		res.body.meta = {};

		if (req.identity) {
			if (req.identity.channel) {
				res.body.meta.channel = req.identity.channel.id;
			}
			if (req.identity.platform) {
				res.body.meta.platform = req.identity.platform.platformType;
			}
		}

		next();
	};
};

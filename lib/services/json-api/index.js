'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Boom = require('boom');

const JSON_API_KEYS = ['id', 'type', 'relationships', 'meta', 'links'];
const JSON_API_CREATE_KEYS = ['type'];
const JSON_API_UPDATE_KEYS = ['id', 'type'];

exports.initialize = function (bus) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	const service = {
		name: 'json-api',

		jsonApiValidateCreate(resource) {
			resource = resource || {};
			JSON_API_CREATE_KEYS.forEach(key => {
				if (!_.has(resource, key)) {
					throw new Error(`JSON API resource missing "${key}" property`);
				}
			});

			return resource;
		},

		jsonApiValidateUpdate(resource) {
			resource = resource || {};
			JSON_API_UPDATE_KEYS.forEach(key => {
				if (!_.has(resource, key)) {
					throw new Error(`JSON API resource missing "${key}" property`);
				}
			});

			return resource;
		},

		jsonApiFormat(resource, baseUrl) {
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
		},

		jsonApiDeformat(resource) {
			resource = resource || {};
			if (resource.attributes && _.isObject(resource.attributes)) {
				Object.keys(resource.attributes).forEach(key => {
					resource[key] = resource.attributes[key];
				});
			}
			delete resource.attributes;
			delete resource.links;
			return resource;
		},

		jsonApiComposeIncluded(data, baseUrl) {
			const relationships = data.relationships || {};
			const included = data.included || [];

			// Remove relationship references that were not found.
			Object.keys(relationships).forEach(key => {
				const rel = relationships[key].data || [];
				rel.slice().forEach((item, i) => {
					const foundIndex = _.findIndex(included, {type: item.type, id: item.id});
					if (foundIndex < 0) {
						bus.broadcast({role: 'events', event: 'json-api-missing-relationship'}, {
							message: `id:${data.id}, key:${key}, fk:${item.id}`
						});
						rel.splice(i, 1);
					}
				});
			});

			if (included.length) {
				return included.map(entity => {
					return service.format(entity, baseUrl);
				});
			}

			return [];
		}
	};

	service.middleware = {
		formatter() {
			return function jsonApiFormatter(req, res, next) {
				if (_.isEmpty(res.body)) {
					return next(Boom.notFound());
				}

				const baseUrl = `${req.protocol}://${req.hostname}`;

				const data = _.cloneDeep(res.body);
				res.body = {};

				if (_.isArray(data)) {
					res.body.data = _.map(data, object => {
						delete object.included;
						return service.format(object, baseUrl);
					});
				} else {
					if (_.isString(req.query.include)) {
						res.body.included = service.composeIncluded(data, baseUrl);
					}
					delete data.included;
					res.body.data = service.format(data, baseUrl);
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
		},

		deformatter() {
			return function jsonApiDeformatter(req, res, next) {
				switch (req.method.toUpperCase()) {
					case 'POST':
						try {
							req.body = service.validateCreate(req.body.data);
						} catch (err) {
							return next(Boom.badRequest(err.message));
						}
						break;
					case 'PUT':
					case 'PATCH':
						try {
							req.body = service.validateUpdate(req.body.data);
						} catch (err) {
							return next(Boom.badRequest(err.message));
						}
						break;
					default:
						return next();
				}

				req.body = service.deformat(req.body);
				next();
			};
		}
	};

	return Promise.resolve(service);
};

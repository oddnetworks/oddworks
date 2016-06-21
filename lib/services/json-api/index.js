'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Boom = require('boom');

const JSON_API_KEYS = ['id', 'type', 'relationships', 'meta', 'links'];
const JSON_API_CREATE_KEYS = ['type'];
const JSON_API_UPDATE_KEYS = ['id', 'type'];

let SERVICE;

exports.initialize = function (bus) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	const service = {
		name: 'json-api',
		bus,
		middleware: exports.middleware,
		format,
		deformat,
		validateCreate,
		validateUpdate,
		composeIncluded,
		formatError
	};

	SERVICE = service;
	return Promise.resolve(service);
};

exports.middleware = {
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
	},

	deformatter() {
		return function jsonApiDeformatter(req, res, next) {
			switch (req.method.toUpperCase()) {
				case 'POST':
					try {
						req.body = validateCreate(req.body.data);
					} catch (err) {
						return next(Boom.badRequest(err.message));
					}
					break;
				case 'PUT':
				case 'PATCH':
					try {
						req.body = validateUpdate(req.body.data);
					} catch (err) {
						return next(Boom.badRequest(err.message));
					}
					break;
				default:
					return next();
			}

			req.body = deformat(req.body);
			next();
		};
	},

	handleError(options) {
		options = options || {};
		const handler = options.handler;

		function shouldReportError(err) {
			if (_.isFunction(handler)) {
				if (err && err.output && err.output.statusCode < 500) {
					return false;
				}
				return true;
			}
			return false;
		}

		return function errorHandling(err, req, res, next) {
			if (err) {
				// We treat Boom errors specially
				// https://github.com/hapijs/boom

				if (shouldReportError(err)) {
					handler(err, req);
				}

				res
					.status(err.isBoom ? err.output.statusCode : 500)
					.send({error: formatError(err)});
			} else {
				next();
			}
		};
	}
};

//
// Library
//

function validateCreate(resource) {
	resource = resource || {};
	JSON_API_CREATE_KEYS.forEach(key => {
		if (!_.has(resource, key)) {
			throw new Error(`JSON API resource missing "${key}" property`);
		}
	});

	return resource;
}

function validateUpdate(resource) {
	resource = resource || {};
	JSON_API_UPDATE_KEYS.forEach(key => {
		if (!_.has(resource, key)) {
			throw new Error(`JSON API resource missing "${key}" property`);
		}
	});

	return resource;
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

function deformat(resource) {
	resource = resource || {};
	if (resource.attributes && _.isObject(resource.attributes)) {
		Object.keys(resource.attributes).forEach(key => {
			resource[key] = resource.attributes[key];
		});
	}
	delete resource.attributes;
	delete resource.links;
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
				SERVICE.bus.broadcast({level: 'warn', event: 'json-api-missing-relationship'}, {
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

function formatError(error) {
	const output = error.output || {};
	return {
		status: output.statusCode ? output.statusCode.toString() : null,
		title: error.name,
		detail: error.message
	};
}

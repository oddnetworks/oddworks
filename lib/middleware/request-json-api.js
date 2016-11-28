'use strict';

const _ = require('lodash');
const Boom = require('boom');

const JSON_API_CREATE_KEYS = ['type'];
const JSON_API_UPDATE_KEYS = ['id', 'type'];

module.exports = function () {
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

	const jsonApiDeformatter = (req, res, next) => {
		if (!req.body) {
			return next();
		}

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
			case 'DELETE':
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

	return jsonApiDeformatter;
};

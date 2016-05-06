'use strict';

const _ = require('lodash');

const jsonAPIKeys = ['id', 'type', 'relationships', 'meta', 'links'];
const keyPaths = ['id', 'type', 'attributes'];

module.exports = {
	validate(resource) {
		keyPaths.forEach(path => {
			if (!_.has(resource, path)) {
				throw new Error(`missing ${path}`);
			}
		});

		return true;
	},

	format(resource, baseUrl) {
		const attributes = _.omit(resource, jsonAPIKeys);

		_.forOwn(attributes, (value, key) => {
			delete resource[key];
		});

		resource.attributes = _.cloneDeep(attributes);
		if (resource.id && resource.type) {
			resource.relationships = resource.relationships || {};
			resource.links = {
				self: `${baseUrl}/${resource.type}s/${resource.id}`
			};
			resource.meta = resource.meta || {};
		}

		return resource;
	},

	deformat(resource) {
		if (_.has(resource, 'attributes')) {
			_.keys(resource.attributes).forEach(key => {
				resource[key] = resource.attributes[key];
			});
			delete resource.attributes;
			delete resource.links;

			return resource;
		}
	}
};

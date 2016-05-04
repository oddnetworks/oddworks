'use strict';

const _ = require('lodash');

const jsonAPIKeys = ['id', 'type', 'relationships', 'meta', 'links'];

module.exports = {
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
		if (_.has(resource, 'data.attributes')) {
			_.keys(resource.data.attributes).forEach(key => {
				resource.data[key] = resource.data.attributes[key];
			});
			delete resource.data.attributes;

			return resource.data;
		}
	}
};

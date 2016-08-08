'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

// bus - Oddcast Bus Object
// options.types - Array of String types *required*
// options.cloudsearchdomain - CloudSearchDomain connection Object *required*
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const cloudsearch = options.cloudsearch;
	const types = options.types || ['video', 'collection'];

	if (!Array.isArray(types) || !types.length) {
		throw new Error('The options.types Array is required.');
	}

	if (!cloudsearch || !_.isObject(cloudsearch)) {
		throw new Error('The options.cloudsearch Connection Object is required.');
	}

	function index() {
		return Promise.resolve(true);
	}

	function query(payload) {
		if (!payload.query || !_.isString(payload.query)) {
			return Promise.reject(new Error('query() payload.query String is required.'));
		}

		const typeFilter = payload.type ? [payload.type] : types;

		const facet = {
			channel: {buckets: [payload.channel]},
			type: {buckets: typeFilter}
		};

		const params = {
			query: `${payload.query}* | ${payload.query}`,
			facet: JSON.stringify(facet)
		};

		return new Promise((resolve, reject) => {
			cloudsearch.search(params, (err, results) => {
				if (err) {
					return reject(err);
				}

				const items = results.hits.hit.map(hit => {
					return bus.query({role: 'store', cmd: 'get', type: hit.fields.type[0]}, {id: hit.id, type: hit.fields.type[0], channel: hit.fields.channel[0]});
				});

				return Promise.all(items).then(resolve).catch(reject);
			});
		});
	}

	types.forEach(type => {
		bus.commandHandler({role: 'store', cmd: 'index', type}, index);
	});

	bus.queryHandler({role: 'store', cmd: 'query'}, query);

	return Promise.resolve({
		name: 'cloudsearch',
		bus,
		options,
		types,
		cloudsearch,
		index,
		query
	});
};

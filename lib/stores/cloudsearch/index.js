'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

// bus - Oddcast Bus Object
// options.store - An oddworks store instance
// options.cloudsearchdomain - CloudSearchDomain connection Object *required*
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const cloudsearch = options.cloudsearch;
	const store = options.store;

	if (!store || !_.isObject(store)) {
		throw new Error('The options.store Object is required.');
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

		const typeFilter = payload.type ? [payload.type] : store.types;

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

				let items;

				if (typeFilter) {
					items = results.hits.hit.map(hit => {
						return {type: typeFilter, id: hit.id};
					});
				} else {
					items = _.flatten(results.hits.hit.map(hit => {
						return store.types.map(type => {
							return {type, id: hit.id};
						});
					}));
				}

				bus.query({role: 'store', cmd: 'batchGet', store: store.name}, {channel: payload.channel, keys: items})
					.then(results => resolve(_.compact(results)));
			});
		});
	}

	store.types.forEach(type => {
		bus.commandHandler({role: 'store', cmd: 'index', type}, index);
	});

	bus.queryHandler({role: 'store', cmd: 'query'}, query);

	return Promise.resolve({
		name: 'cloudsearch',
		bus,
		options,
		types: store.types,
		cloudsearch,
		index,
		query
	});
};

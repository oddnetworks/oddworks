'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Search = require('redis-search');

// bus - Oddcast Bus Object
// options.store - An oddworks store instance
// options.redis - Redis connection Object *required*
// options.config - Configuration Object to pass to Search.createSearch()
//                  https://github.com/seipop/redis-search
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const config = options.config || {};
	const redis = options.redis;
	const store = options.store;

	if (!store || !_.isObject(store)) {
		throw new Error('The options.store Object is required.');
	}

	if (!redis || !_.isObject(redis)) {
		throw new Error('The options.redis Connection Object is required.');
	}

	config.client = redis;
	const search = Search.createSearch(config);

	function index(payload) {
		return new Promise((resolve, reject) => {
			search.index(payload.text, payload.id, err => {
				if (err) {
					reject(err);
				}
				resolve(true);
			});
		});
	}

	function query(payload) {
		const query = payload.query;
		const typeFilter = payload.type;

		return new Promise((resolve, reject) => {
			search.query(query, (err, ids) => {
				if (err) {
					return reject(err);
				}

				let items;

				if (typeFilter) {
					items = ids.map(id => {
						return {type: typeFilter, id};
					});
				} else {
					items = _.flatten(ids.map(id => {
						return store.types.map(type => {
							return {type, id};
						});
					}));
				}

				return bus
					.query({role: 'store', cmd: 'batchGet', store: store.name}, items)
					.then(_.compact);
			});
		});
	}

	store.types.forEach(type => {
		bus.commandHandler({role: 'store', cmd: 'index', type}, index);
	});

	bus.queryHandler({role: 'store', cmd: 'query'}, query);

	return Promise.resolve({
		name: 'redis-search',
		bus,
		options,
		types: store.types,
		search,
		redis,
		index,
		query
	});
};

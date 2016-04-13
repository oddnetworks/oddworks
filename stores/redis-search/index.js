'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Search = require('redis-search');

const store = exports = module.exports = {};
let config = {};

store.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	if (config.options.redis) {
		config.options.search = Search.createSearch({client: config.options.redis});
	}

	return new Promise((resolve, reject) => {
		if (config.options.types) {
			config.options.types.forEach(type => {
				config.bus.commandHandler({role: 'store', cmd: 'index', type}, index);
			});
			config.bus.queryHandler({role: 'store', cmd: 'query'}, query);

			resolve(true);
		} else {
			reject(new Error('options.types is missing'));
		}
	});
};

function index(payload) {
	config.options.search.index(payload.text, payload.id);
	return Promise.resolve(true);
}

function query(payload) {
	return new Promise((resolve, reject) => {
		config.options.search.query(payload.query, (err, ids) => {
			if (err) {
				return reject(err);
			}

			Promise
				.map(ids, id => Promise.map(config.options.types, type => config.bus.query({role: 'store', cmd: 'get', type}, {id, type})))
				.then(objects => resolve(_.compact(_.flatten(objects))));
		});
	});
}

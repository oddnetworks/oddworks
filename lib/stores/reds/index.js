'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Search = require('reds');

// bus - Oddcast Bus Object
// options.store - An oddworks store instance
// options.redis - Redis connection Object *required*
// options.key - Namespacing
// options.autoindex - Store listens to the bus and auto updates the index
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const config = options.config || {};
	const redis = options.redis;
	const store = options.store;

	options.autoindex = Boolean(options.autoindex) || false;

	if (!store || !_.isObject(store)) {
		throw new Error('The options.store Object is required.');
	}

	if (!redis || !_.isObject(redis)) {
		throw new Error('The options.redis Connection Object is required.');
	}

	Search.client = redis;
	const search = Search.createSearch(config.key || 'ns');

	function index(payload) {
		if (!payload.text || !_.isString(payload.text)) {
			return Promise.reject(new Error('index() payload.text String is required.'));
		}

		return new Promise((resolve, reject) => {
			search.index(payload.text, payload.id, err => {
				if (err) {
					reject(err);
				}
				resolve(true);
			});
		});
	}

	function deindex(payload) {
		if (!payload.id) {
			return Promise.reject(new Error('deindex() payload.id String is required.'));
		}

		return new Promise((resolve, reject) => {
			search.remove(payload.id, err => {
				if (err) {
					reject(err);
				}
				resolve(true);
			});
		});
	}

	function query(payload) {
		const channel = payload.channel;
		const query = payload.query;
		const typesFilter = payload.types || store.types;

		return new Promise((resolve, reject) => {
			search
				.query(query)
				.end((err, ids) => {
					if (err) {
						return reject(err);
					}

					const items = _.flatten(ids.map(id => {
						return typesFilter.map(type => {
							return {type, id};
						});
					}));

					bus.query({role: 'store', cmd: 'batchGet', store: store.name}, {channel, keys: items})
						.then(results => resolve(_.compact(results)));
				});
		});
	}

	store.types.forEach(type => {
		bus.commandHandler({role: 'store', cmd: 'index', type}, index);

		bus.commandHandler({role: 'store', cmd: 'deindex', type}, deindex);

		// Add autoindexing listeners to store:set/remove
		if (options.autoindex === true) {
			bus.observe({role: 'store', cmd: 'set', type}, event => {
				const resource = event.payload;

				// On store:set, if resource.meta.searchable is true then index, otherwise deindex
				if (_.get(resource, 'meta.internal.searchable', false)) {
					let text = '';
					text += resource.title || ' ';
					text += resource.description || ' ';
					text += (Array.isArray(resource.genres)) ? resource.genres.join(' ').trim() || ' ' : ' ';
					text += (Array.isArray(resource.tags)) ? resource.tags.join(' ').trim() || ' ' : ' ';
					text = text.trim();

					bus.sendCommand(
						{role: 'store', cmd: 'index', type: resource.type},
						{id: resource.id, text}
					).catch(err => {
						bus.broadcast(
							{level: 'warn', event: 'error-role-store-cmd-index'},
							{message: err.message, error: err}
						);
						return null;
					});
				} else {
					bus.sendCommand(
						{role: 'store', cmd: 'deindex', type: resource.type},
						{id: resource.id}
					).catch(err => {
						bus.broadcast(
							{level: 'warn', event: 'error-role-store-cmd-deindex'},
							{message: err.message, error: err}
						);
						return null;
					});
				}
			});

			bus.observe({role: 'store', cmd: 'remove', type}, event => {
				const resource = event.payload;

				bus.sendCommand(
					{role: 'store', cmd: 'deindex', type: resource.type},
					{id: resource.id}
				).catch(err => {
					bus.broadcast(
						{level: 'warn', event: 'error-role-store-cmd-deindex'},
						{message: err.message, error: err}
					);
					return null;
				});
			});
		}
	});

	bus.queryHandler({role: 'store', cmd: 'query'}, query);

	return Promise.resolve({
		name: 'reds',
		bus,
		options,
		types: store.types,
		search,
		redis,
		index,
		query
	});
};

'use strict';

const Promise = require('bluebird');
const uuid = require('node-uuid');

const store = exports = module.exports = {};
let config = {};

store.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	return new Promise((resolve, reject) => {
		if (config.options.types) {
			config.options.types.forEach(type => {
				config.bus.queryHandler({role: 'store', cmd: 'get', type}, get);
				config.bus.queryHandler({role: 'store', cmd: 'set', type}, set);
				config.bus.commandHandler({role: 'store', cmd: 'set', type}, set);
			});

			resolve(true);
		} else {
			reject(new Error('options.types is missing'));
		}
	});
};

function get(payload) {
	if (!payload.type) {
		return Promise.reject(new Error('payload.type is required'));
	}

	if (payload.id) {
		return config.options.postgres.connection.select().table(payload.type).where({
			id: payload.id
		}).then(results => {
			debugger;
			return results[0].doc
		});
	}

	return config.options.postgres.connection.select().table(payload.type);
}

function set(payload) {
	if (!payload.type) {
		return Promise.reject(new Error('payload.type is required'));
	}

	payload.id = payload.id || uuid.v4();

	return config.options.postgres.connection.insert({id: payload.id, doc: payload}).into(payload.type).then(() => payload)
		.catch(e => {
			console.error(`Failed to INSERT: ${e}`);
			return config.options.postgres.connection.table(payload.type).update({doc: payload}).where({id: payload.id}).then(() => payload);
		});
}

store.name = 'postgres';

'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');

const store = exports = module.exports = {};

let STORE = {};

store.initialize = (bus, options) => {
	if (options.types) {
		options.types.forEach(type => {
			bus.queryHandler({role: 'store', cmd: 'get', type: type}, get);
			bus.queryHandler({role: 'store', cmd: 'set', type: type}, set);
			bus.commandHandler({role: 'store', cmd: 'set', type: type}, set);
		});

		return Promise.resolve(true);
	}

	return Promise.reject(new Error('options.types is missing'));
};

function get(payload) {
	if (!payload.type) {
		return Promise.reject(new Error('payload.type is require'));
	}

	if (payload.id) {
		return Promise.resolve(STORE[payload.type][payload.id]);
	}

	return Promise.resolve(_.toArray(STORE[payload.type]));
}

function set(payload) {
	// Make a copy to prevent unintended mutation.
	payload = _.cloneDeep(payload);
	payload.id = payload.id || uuid.v4();

	// Create the store "table" Object if it does not exist.
	STORE[payload.type] = STORE[payload.type] || {};

	STORE[payload.type][payload.id] = payload;
	return Promise.resolve(payload);
}

store.name = 'catalog';

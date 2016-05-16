'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');

const store = exports = module.exports = {};

let STORE = {};

store.initialize = (bus, options) => {
	if (options.types) {
		options.types.forEach(type => {
			bus.queryHandler({role: 'store', cmd: 'get', type}, createGetter(type));
			bus.queryHandler({role: 'store', cmd: 'set', type}, createSetter(type));
			bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(type));
		});

		return Promise.resolve(true);
	}

	return Promise.reject(new Error('options.types is missing'));
};

function createGetter(type) {
	return function get(payload) {
		if (payload.id) {
			return Promise.resolve(STORE[type][payload.id]);
		}

		return Promise.resolve(_.toArray(STORE[type]));
	};
}

function createSetter(type) {
	return function set(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.id = payload.id || uuid.v4();

		// Create the store "table" Object if it does not exist.
		STORE[type] = STORE[type] || Object.create(null);

		STORE[type][payload.id] = payload;
		return Promise.resolve(payload);
	};
}

store.name = 'catalog';

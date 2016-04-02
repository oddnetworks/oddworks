'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('uuid');

const store = exports = module.exports = {};

let STORE = {};

store.initialize = (bus, options) => {
	return new Promise((resolve, reject) => {
		if (options.types) {
			options.types.forEach(type => {
				bus.queryHandler({role: 'store', cmd: 'get', type: type}, get);
				bus.queryHandler({role: 'store', cmd: 'set', type: type}, set);
			});

			resolve(true);
		} else {
			reject(new Error('options.types is missing'));
		}
	});
};

function get(payload) {
	return new Promise((resolve) => {
		if (payload.id) {
			return resolve(STORE[payload.type][payload.id]);
		}

		return resolve(_.toArray(STORE[payload.type]));
	});
}

function set(payload) {
	return new Promise((resolve) => {
		payload.id = payload.id || uuid.v4();
		STORE[payload.type] = STORE[payload.type] || {};
		STORE[payload.type][payload.id] = payload;
		return resolve(payload);
	});
}

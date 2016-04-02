'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('uuid');

const store = exports = module.exports = {};
let config = {};

store.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	Promise.promisifyAll(config.options.redis);

	return new Promise((resolve, reject) => {
		if (config.options.types) {
			config.options.types.forEach(type => {
				bus.queryHandler({role: 'store', cmd: 'get', type}, get);
				bus.queryHandler({role: 'store', cmd: 'set', type}, set);
				bus.commandHandler({role: 'store', cmd: 'set', type}, set);
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
			return config.options.redis.hgetAsync(payload.type, payload.id)
				.then(object => {
					return resolve(JSON.parse(object));
				});
		}

		return config.options.redis.hgetallAsync(payload.type)
			.then(objects => {
				objects = _.map(_.toArray(objects), object => {
					return JSON.parse(object);
				});
				return resolve(objects);
			});
	});
}

function set(payload) {
	return new Promise((resolve) => {
		payload.id = payload.id || uuid.v4();
		config.options.redis.hsetAsync(payload.type, payload.id, JSON.stringify(payload));
		return resolve(payload);
	});
}

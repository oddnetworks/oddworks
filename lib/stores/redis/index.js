'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');

const store = exports = module.exports = {};
let config = {};

store.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	Promise.promisifyAll(config.options.redis);

	if (config.options.types) {
		config.options.types.forEach(type => {
			config.bus.queryHandler({role: 'store', cmd: 'get', type}, get);
			config.bus.queryHandler({role: 'store', cmd: 'set', type}, set);
			config.bus.commandHandler({role: 'store', cmd: 'set', type}, set);
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
		return config.options.redis
			.hgetAsync(payload.type, payload.id)
			.then(object => {
				return JSON.parse(object);
			});
	}

	return config.options.redis
		.hgetallAsync(payload.type)
		.then(objects => {
			return _.map(_.toArray(objects), object => {
				return JSON.parse(object);
			});
		});
}

function set(payload) {
	// Make a copy to prevent unintended mutation.
	payload = _.cloneDeep(payload);
	payload.id = payload.id || uuid.v4();

	return config.options.redis.hsetAsync(payload.type, payload.id, JSON.stringify(payload))
		.then(() => {
			return payload;
		});
}

store.name = 'redis';

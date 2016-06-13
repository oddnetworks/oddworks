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
			config.bus.queryHandler({role: 'store', cmd: 'get', type}, createGetter(type));
			config.bus.queryHandler({role: 'store', cmd: 'scan', type}, createScanner(type));
			config.bus.queryHandler({role: 'store', cmd: 'set', type}, createSetter(type));
			config.bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(type));
		});

		return Promise.resolve(true);
	}

	return Promise.reject(new Error('options.types is missing'));
};

function createGetter(type) {
	return function get(payload) {
		return config.options.redis
			.hgetAsync(type, payload.id)
			.then(object => {
				return JSON.parse(object);
			});
	};
}

function createScanner(type) {
	return function scan(payload) {
		payload = payload || {};
		const limit = parseInt(payload.limit, 10) || 10;

		return config.options.redis
			// The result count includes keys and values, which halves our limit,
			// so we multiply by 2
			.hscanAsync(type, 0, 'COUNT', (limit * 2))
			.then(res => {
				// The cursor is the first result, and the Array of
				// data is the second result
				const results = res[1];

				return results
					// Filter the keys out from the values. The Array starts with a key
					// and every other item is a value.
					.filter((item, i) => {
						return i % 2 === 1;
					})
					// Redis is liberal with the COUNT parameter so we try to do a better
					// job honouring the limit.
					.slice(0, limit)
					// Convert strings returned from Redis into objects
					.map(JSON.parse);
			});
	};
}

function createSetter(type) {
	return function set(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.id = payload.id || uuid.v4();

		return config.options.redis.hsetAsync(type, payload.id, JSON.stringify(payload))
			.then(() => {
				return payload;
			});
	};
}

store.name = 'redis';

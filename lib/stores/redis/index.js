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
			config.bus.queryHandler({role: 'store', cmd: 'set', type}, createSetter(type));
			config.bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(type));
		});

		return Promise.resolve(true);
	}

	return Promise.reject(new Error('options.types is missing'));
};

function createGetter(type) {
	return function get(payload) {
		if (payload.id) {
			return config.options.redis
				.hgetAsync(type, payload.id)
				.then(object => {
					return JSON.parse(object);
				});
		}

		return config.options.redis
			.hgetallAsync(type)
			.then(objects => {
				return _.map(_.toArray(objects), object => {
					return JSON.parse(object);
				});
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

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
	return new Promise((resolve, reject) => {
		if (!payload.type) {
			return reject(new Error('payload.type is require'));
		}

		if (payload.id) {
			return config.options.redis
				.hgetAsync(payload.type, payload.id)
				.then(object => resolve(JSON.parse(object)))
				.catch(err => reject(err));
		}

		return config.options.redis
			.hgetallAsync(payload.type)
			.then(objects => {
				objects = _.map(_.toArray(objects), object => {
					return JSON.parse(object);
				});
				return resolve(objects);
			})
			.catch(err => reject(err));
	});
}

function set(payload) {
	return new Promise((resolve, reject) => {
		payload.id = payload.id || uuid.v4();
		config.options.redis.hsetAsync(payload.type, payload.id, JSON.stringify(payload))
			.then(() => resolve(payload))
			.catch(err => reject(err));
	});
}

store.name = 'redis';

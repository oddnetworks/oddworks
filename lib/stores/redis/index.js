'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');

const store = exports = module.exports = {};

store.name = 'redis';

store.initialize = (bus, options) => {
	store.bus = bus;
	store.options = options;

	Promise.promisifyAll(store.options.redis);

	return new Promise((resolve, reject) => {
		if (store.options.types) {
			store.options.types.forEach(type => {
				store.bus.queryHandler({role: 'store', cmd: 'get', type}, get);
				store.bus.queryHandler({role: 'store', cmd: 'set', type}, set);
				store.bus.commandHandler({role: 'store', cmd: 'set', type}, set);
				store.bus.commandHandler({role: 'store', cmd: 'del', type}, del);
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
			return store.options.redis
				.hgetAsync(payload.type, payload.id)
				.then(object => resolve(JSON.parse(object)))
				.catch(err => reject(err));
		}

		return store.options.redis
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
		store.options.redis.hsetAsync(payload.type, payload.id, JSON.stringify(payload))
			.then(() => resolve(payload))
			.catch(err => reject(err));
	});
}

function del(payload) {
	return new Promise((resolve, reject) => {
		store.options.redis.hdelAsync(payload.type, payload.id)
			.then(() => resolve(payload))
			.catch(err => reject(err));
	});
}

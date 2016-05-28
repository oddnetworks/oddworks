'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const uuid = require('node-uuid');

const store = exports = module.exports = {};

store.initialize = (bus, options) => {
	store.bus = bus;
	store.options = options;

	Promise.promisifyAll(store.options.riak);

	if (store.options.types) {
		store.options.types.forEach(type => {
			store.bus.queryHandler({role: 'store', cmd: 'get', type}, createGetter(type));
			store.bus.queryHandler({role: 'store', cmd: 'set', type}, createSetter(type));
			store.bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(type));
			store.bus.queryHandler({role: 'store', cmd: 'query'}, query);
		});

		return Promise.resolve(true);
	}

	return Promise.reject(new Error('options.types is missing'));
};

function query(payload) {
	return new Promise((resolve, reject) => {
		if (!store.options.searchIndex) {
			return reject('options.searchIndex not set');
		}

		store.options.riak
			.searchAsync({
				indexName: store.options.searchIndex,
				q: `title:"${payload.query}" OR description:"${payload.query}"`
			})
			.then(results => resolve(results.docs))
			.catch(err => reject(err));
	});
}

function createGetter(type) {
	return function get(payload) {
		if (payload.id) {
			return store.options.riak
				.fetchValueAsync({
					bucket: type,
					key: payload.id,
					convertToJs: true
				})
				.then(result => {
					var object = result.values.shift();
					return _.get(object, 'value', null);
				});
		}

		return store.options.riak
			.listKeysAsync({
				bucket: type
			})
			.then(results => {
				return Promise.map(results.keys, key => {
					return store.options.riak
						.fetchValueAsync({
							bucket: type,
							key: key,
							convertToJs: true
						});
				});
			})
			.then(results => {
				return _.map(results[0].values, object => {
					return _.get(object, 'value', null);
				});
			});
	};
}

function createSetter(type) {
	return function set(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.id = payload.id || uuid.v4();

		return store.options.riak
			.storeValueAsync({
				bucket: type,
				key: payload.id,
				value: payload
			})
			.then(() => {
				return payload;
			});
	};
}

store.name = 'riak';

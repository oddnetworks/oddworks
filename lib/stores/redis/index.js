'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

// bus - Oddcast Bus Object
// options.types - Array of String types *required*
// options.redis - Redis connection Object *required*
exports.initialize = function createRedisStore(bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const types = options.types;
	const redis = options.redis;

	if (!Array.isArray(types) || !types.length) {
		throw new Error('The options.types Array is required.');
	}

	if (!redis || !_.isObject(redis)) {
		throw new Error('The options.redis Connection Object is required.');
	}

	function createSetter(type) {
		return function set(payload) {
			if (!payload.channel || !_.isString(payload.channel)) {
				return Promise.reject(new Error('set() payload.channel String is required.'));
			}

			// Make a copy to prevent unintended mutation.
			payload = _.cloneDeep(payload);
			payload.type = type;
			payload.id = payload.id || uuid.v4();

			const key = `${payload.channel}:${type}`;

			return redis
				.hsetAsync(key, payload.id, JSON.stringify(payload))
				.then(_.constant(payload));
		};
	}

	function createGetter(type) {
		return function get(args) {
			args = args || {};
			if (!args.id || !_.isString(args.id)) {
				return Promise.reject(new Error('get() args.id String is required.'));
			}
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('get() args.channel String is required.'));
			}

			const channel = args.channel;
			const id = args.id;
			const include = args.include;
			const key = `${channel}:${type}`;

			const promise = redis.hgetAsync(key, id).then(res => {
				return res ? JSON.parse(res) : null;
			});

			// Get included entities if requested.
			if (include && include.length) {
				return promise.then(entity => {
					if (!entity) {
						return entity;
					}

					const relationships = entity.relationships || Object.create(null);

					const commands = _
						.flatten(include.map(key => {
							return (relationships[key] || {}).data || [];
						}))
						.map(item => {
							item = item || {};
							const key = `${channel}:${item.type}`;
							return ['hget', key, item.id];
						});

					return redis.multi(commands).execAsync().then(res => {
						if (res.length) {
							res = _.compact(res);
							entity.included = JSON.parse(`[${res.join(',')}]`);
						} else {
							entity.included = [];
						}

						return entity;
					});
				});
			}

			return promise;
		};
	}

	function createScanner(type) {
		return function scan(args) {
			args = args || {};
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('scan() args.channel String is required.'));
			}

			const limit = parseInt(args.limit, 10) || 10;
			const key = `${args.channel}:${type}`;

			// The result count includes keys and values, which halves our limit,
			// so we multiply by 2
			return redis.hscanAsync(key, 0, 'COUNT', (limit * 2)).then(res => {
				// The cursor is the first result, and the Array of
				// data is the second result
				const results = res[1];

				const filtered = results
					// Filter the keys out from the values. The Array starts with a key
					// and every other item is a value.
					.filter((item, i) => {
						return i % 2 === 1;
					})
					// Redis is liberal with the COUNT parameter so we try to do a better
					// job honouring the limit.
					.slice(0, limit);

				return JSON.parse(`[${filtered.join(',')}]`);
			});
		};
	}

	function batchGet(args) {
		args = args || {};
		if (!args.channel || !_.isString(args.channel)) {
			return Promise.reject(new Error('batchGet() args.channel String is required.'));
		}
		if (!Array.isArray(args.keys)) {
			throw new Error('batchGet() args.keys must be an Array.');
		}

		const channel = args.channel;
		const keys = args.keys;

		if (!keys.length) {
			return Promise.resolve([]);
		}

		const commands = keys.map(arg => {
			const key = `${channel}:${arg.type}`;
			return ['hget', key, arg.id];
		});

		return redis.multi(commands).execAsync().then(res => {
			if (res.length) {
				res = _.compact(res);
				return JSON.parse(`[${res.join(',')}]`);
			}
			return [];
		});
	}

	types.forEach(type => {
		// args.channel - String *required*
		// args.id - String *required*
		// args.include - Array of String types to include
		bus.queryHandler({role: 'store', cmd: 'get', type}, createGetter(type));

		// args.channel - String *required*
		// args.limit - Number *default == 10*
		bus.queryHandler({role: 'store', cmd: 'scan', type}, createScanner(type));

		// payload - Object
		// payload.channel - String *required*
		bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(type));
	});

	// args.channel - String *required*
	// args.keys - Array of {type, id} Objects
	bus.queryHandler({role: 'store', cmd: 'batchGet'}, batchGet);

	return Promise.resolve({
		name: 'redis-store',
		bus,
		options,
		types,
		redis,
		createSetter,
		createGetter,
		createScanner
	});
};

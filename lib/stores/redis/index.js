'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('uuid/v4');

// bus - Oddcast Bus Object
// options.types - Array of String types *required*
// options.redis - Redis connection Object *required*
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const types = options.types;
	const redis = options.redis;

	if (!Array.isArray(types) || types.length < 1) {
		throw new Error('The options.types Array is required.');
	}

	if (!redis || !_.isObject(redis)) {
		throw new Error('The options.redis Connection Object is required.');
	}

	const store = {
		name: 'redis-store',
		bus,
		options,
		types,
		redis
	};

	// The Redis store uses a best practice "trick" to creating very efficient
	// hash structures in redis. See
	// http://redis.io/topics/memory-optimization#using-hashes-to-abstract-a-very-memory-efficient-plain-key-value-store-on-top-of-redis

	function createKey(object) {
		let key;
		if (object.channel) {
			key = `${object.channel}:${object.type}:${object.id}`;
		} else {
			key = `${object.type}:${object.id}`;
		}

		return {
			key: key.slice(0, -2),
			id: key.slice(-2)
		};
	}

	// Normalized hset implementation
	const hset = (function () {
		let hsetAsync;

		if (_.isFunction(redis.hsetAsync)) {
			hsetAsync = object => {
				const key = createKey(object);
				return redis
					.hsetAsync(key.key, key.id, JSON.stringify(object))
					.then(_.constant(object));
			};
		} else {
			hsetAsync = object => {
				return new Promise((resolve, reject) => {
					const key = createKey(object);
					redis.hset(key.key, key.id, JSON.stringify(object), err => {
						if (err) {
							return reject(err);
						}
						resolve(object);
					});
				});
			};
		}

		return hsetAsync;
	})();

	// Normalized hget implementation
	const hget = (function () {
		let hgetAsync;

		if (_.isFunction(redis.hgetAsync)) {
			hgetAsync = object => {
				const key = createKey(object);
				return redis.hgetAsync(key.key, key.id).then(res => {
					return res ? JSON.parse(res) : null;
				});
			};
		} else {
			hgetAsync = object => {
				return new Promise((resolve, reject) => {
					const key = createKey(object);
					redis.hget(key.key, key.id, (err, res) => {
						if (err) {
							return reject(err);
						}
						resolve(res ? JSON.parse(res) : null);
					});
				});
			};
		}

		return hgetAsync;
	})();

	// Normalized hdel implementation
	const hdel = (function () {
		let hdelAsync;

		if (_.isFunction(redis.hdelAsync)) {
			hdelAsync = object => {
				const key = createKey(object);
				return redis.hdelAsync(key.key, key.id).then(res => {
					return Boolean(res);
				});
			};
		} else {
			hdelAsync = object => {
				return new Promise((resolve, reject) => {
					const key = createKey(object);
					redis.hdel(key.key, key.id, (err, res) => {
						if (err) {
							return reject(err);
						}
						resolve(Boolean(res));
					});
				});
			};
		}

		return hdelAsync;
	})();

	// Normalized Node Redis Multi implementation
	const redisMulti = (function () {
		let redisMultiAsync;

		if (_.isFunction(redis.multi().execAsync)) {
			redisMultiAsync = commands => {
				return redis.multi(commands).execAsync();
			};
		} else {
			redisMultiAsync = commands => {
				return new Promise((resolve, reject) => {
					redis.multi(commands).exec((err, res) => {
						if (err) {
							return reject(err);
						}
						return resolve(res);
					});
				});
			};
		}

		return redisMultiAsync;
	})();

	// Normalized hscan implementation
	const hscan = (function () {
		let scanAsync;

		if (_.isFunction(redis.hscanAync)) {
			scanAsync = pattern => {
				function scan(start, keys) {
					return redis.scanAsync(0, 'MATCH', pattern).then(res => {
						// The cursor is the first result, and the Array of
						// keys is the second result
						const cursor = parseInt(res[0], 10);
						keys = keys.concat(res[1]);

						if (cursor) {
							return scan(cursor, keys);
						}

						return keys;
					});
				}

				return scan(0, []);
			};
		} else {
			scanAsync = pattern => {
				return new Promise((resolve, reject) => {
					function scan(start, keys) {
						redis.scan(start, 'MATCH', pattern, (err, res) => {
							if (err) {
								return reject(err);
							}

							// The cursor is the first result, and the Array of
							// keys is the second result
							const cursor = parseInt(res[0], 10);
							keys = keys.concat(res[1]);

							if (cursor) {
								return scan(cursor, keys);
							}

							resolve(keys);
						});
					}

					scan(0, []);
				});
			};
		}

		const redisScan = args => {
			const channel = args.channel;
			const type = args.type;
			const limit = parseInt(args.limit, 10) || 10;
			const pattern = channel ? `${channel}:${type}:*` : `${type}:*`;

			return scanAsync(pattern).then(keys => {
				if (keys.length < 1) {
					return [];
				}

				const commands = keys.map(key => {
					return ['hscan', key, 0, 'COUNT', limit];
				});

				return redisMulti(commands).then(results => {
					results = results.map(res => {
						// The cursor is the first result, and the Array of
						// data is the second result.
						// Filter the keys out from the values. The Array starts with a key
						// and every other item is a value.
						return res[1].filter((item, i) => {
							return i % 2 === 1;
						});
					});

					// Redis is liberal with the COUNT parameter so we try to do a better
					// job honoring the limit.
					const list = _.flatten(results).slice(0, limit).join(',');
					return JSON.parse(`[${list}]`);
				});
			});
		};

		return redisScan;
	})();

	function createSetter(type) {
		const set = payload => {
			if (!payload.channel || !_.isString(payload.channel)) {
				return Promise.reject(new Error('set() payload.channel String is required.'));
			}

			// Make a copy to prevent unintended mutation.
			payload = _.cloneDeep(payload);
			payload.type = type;
			payload.id = payload.id || uuid();

			return hset(payload);
		};

		return set;
	}

	function setChannel(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.type = 'channel';
		payload.id = payload.id || uuid();

		return hset(payload);
	}

	function createGetter(type) {
		const get = args => {
			args = args || {};
			if (!args.id || !_.isString(args.id)) {
				return Promise.reject(new Error('args.id String is required.'));
			}
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('args.channel String is required.'));
			}

			const channel = args.channel;
			const id = args.id;
			const include = args.include;

			const promise = hget({channel, type, id});

			// Get included entities if requested.
			if (include && include.length > 0) {
				if (!_.isArray(include)) {
					return Promise.reject(new Error('args.include must be an array.'));
				}

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
							const key = createKey({channel, type: item.type, id: item.id});
							return ['hget', key.key, key.id];
						});

					return redisMulti(commands).then(res => {
						if (res.length > 0) {
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

		return get;
	}

	function getChannel(args) {
		args = args || {};
		if (!args.id || !_.isString(args.id)) {
			return Promise.reject(new Error('args.id String is required.'));
		}

		return hget({type: 'channel', id: args.id});
	}

	function createRemover(type) {
		const remove = args => {
			args = args || {};
			if (!args.id || !_.isString(args.id)) {
				return Promise.reject(new Error('args.id String is required.'));
			}
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('args.channel String is required.'));
			}

			const channel = args.channel;
			const id = args.id;
			return hdel({channel, type, id});
		};

		return remove;
	}

	function removeChannel(args) {
		args = args || {};
		if (!args.id || !_.isString(args.id)) {
			return Promise.reject(new Error('args.id String is required.'));
		}

		return hdel({type: 'channel', id: args.id});
	}

	function createScanner(type) {
		const scan = args => {
			args = args || {};
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('scan() args.channel String is required.'));
			}

			const limit = parseInt(args.limit, 10) || 10;

			return hscan({channel: args.channel, type, limit});
		};

		return scan;
	}

	function scanChannels(args) {
		args = args || {};
		const limit = parseInt(args.limit, 10) || 10;
		return hscan({type: 'channel', limit});
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

		if (keys.length < 1) {
			return Promise.resolve([]);
		}

		const commands = keys.map(arg => {
			const key = createKey({channel, type: arg.type, id: arg.id});
			return ['hget', key.key, key.id];
		});

		return redisMulti(commands).then(res => {
			if (res.length > 0) {
				res = _.compact(res);
				return JSON.parse(`[${res.join(',')}]`);
			}
			return [];
		});
	}

	function batchGetChannel(args) {
		args = args || {};

		if (!Array.isArray(args.keys)) {
			throw new Error('batchGet() args.keys must be an Array.');
		}

		const type = 'channel';
		const keys = args.keys;

		if (keys.length < 1) {
			return Promise.resolve([]);
		}

		const commands = keys.map(arg => {
			const key = createKey({type, id: arg.id});
			return ['hget', key.key, key.id];
		});

		return redisMulti(commands).then(res => {
			if (res.length > 0) {
				res = _.compact(res);
				return JSON.parse(`[${res.join(',')}]`);
			}
			return [];
		});
	}

	const configureTypes = types.filter(type => {
		return type !== 'channel';
	});

	configureTypes.forEach(type => {
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

		// args.channel - String *required*
		// args.id - String *required*
		bus.commandHandler({role: 'store', cmd: 'remove', type}, createRemover(type));
	});

	// Everything is different for the "channel" type

	// args.keys - Array of id Strings
	bus.queryHandler(
		{role: 'store', cmd: 'batchGet', store: store.name, type: 'channel'},
		batchGetChannel
	);

	// args.id - String *required*
	bus.queryHandler(
		{role: 'store', cmd: 'get', type: 'channel'},
		getChannel
	);

	// args.limit - Number *default == 10*
	bus.queryHandler(
		{role: 'store', cmd: 'scan', type: 'channel'},
		scanChannels
	);

	// payload - Object
	bus.commandHandler(
		{role: 'store', cmd: 'set', type: 'channel'},
		setChannel
	);

	// args.id - String *required*
	bus.commandHandler(
		{role: 'store', cmd: 'remove', type: 'channel'},
		removeChannel
	);

	// Generic batchGet pattern needs to be declared last because of this bug:
	// https://gitlab.com/oddnetworks/oddworks/oddcast/issues/26
	//
	// args.channel - String *required*
	// args.keys - Array of {type, id} Objects
	bus.queryHandler(
		{role: 'store', cmd: 'batchGet', store: store.name},
		batchGet
	);

	bus.queryHandler(
		{role: 'store', cmd: 'batchGet'},
		batchGet
	);

	return Promise.resolve(store);
};

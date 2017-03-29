'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

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
	//
	// args.channel
	// args.type
	// args.limit
	// args.sort
	// args.descending
	// args.lastEvalutatedKey
	//   .key
	//   .cursor
	//
	// In unsorted sets with a lastEvaluatedKey the limit is a fuzzy suggestion.
	const hscan = (function () {
		const SCAN_PAGE_SIZE = 200000;
		const HSCAN_CHUNK_SIZE = 200;

		let scanAsync;

		if (_.isFunction(redis.hscanAync)) {
			scanAsync = (pattern, cursor, limit) => {
				return redis.scanAsync(cursor, 'MATCH', pattern, 'COUNT', limit).then(res => {
					// The cursor is the first result, and the Array of
					// keys is the second result
					const cursor = parseInt(res[0], 10) || null;
					const keys = res[1];

					return {cursor, keys};
				});
			};
		} else {
			scanAsync = (pattern, cursor, limit) => {
				return new Promise((resolve, reject) => {
					redis.scan(cursor, 'MATCH', pattern, 'COUNT', limit, (err, res) => {
						if (err) {
							return reject(err);
						}

						// The cursor is the first result, and the Array of
						// keys is the second result
						const cursor = parseInt(res[0], 10) || null;
						const keys = res[1];

						return resolve({cursor, keys});
					});
				});
			};
		}

		function hscanValues(keys) {
			const commands = keys.map(key => {
				return ['hscan', key, 0, 'COUNT', 256];
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

				results = _.flatten(results).join(',');
				return JSON.parse(`[${results}]`);
			});
		}

		function fetchAllKeys(pattern, pageSize) {
			function fetchPage(keys, cursor) {
				return scanAsync(pattern, cursor, pageSize).then(res => {
					keys = keys.concat(res.keys);

					if (res.cursor) {
						return fetchPage(keys, res.cursor);
					}

					return keys;
				});
			}

			return fetchPage([], 0);
		}

		function fetchKeysLimited(pattern, cursor, pageSize, limit) {
			function fetchPage(keys, cursor) {
				return scanAsync(pattern, cursor, pageSize).then(res => {
					keys = keys.concat(res.keys);

					if (res.cursor && keys.length <= limit) {
						return fetchPage(keys, res.cursor, pageSize);
					}

					return {keys, cursor: res.cursor};
				});
			}

			return fetchPage([], 0);
		}

		const redisScan = args => {
			const channel = args.channel;
			const type = args.type;
			const limit = parseInt(args.limit, 10) || 10;
			const pattern = channel ? `${channel}:${type}:*` : `${type}:*`;

			const lastEvalutatedKey = (args.lastEvalutatedKey || {}).key;
			const lastCursor = (args.lastEvalutatedKey || {}).cursor || 0;

			const sort = args.sort;
			const descending = Boolean(args.descending);

			if (sort) {
				return fetchAllKeys(pattern, SCAN_PAGE_SIZE)
					.then(keys => {
						// Fetch all the records in batches after scanning in all the keys.
						const chunks = _.chunk(keys, HSCAN_CHUNK_SIZE);

						// Fetch batches in serial by .reduce() ing a chain of Promises.
						return chunks.reduce((promise, keys) => {
							return promise.then(() => {
								return hscanValues(keys);
							});
						}, Promise.resolve(null));
					})
					.then(results => {
						// Since we fetched items in chunks, we need to flatten the results
						// into a single Array.
						return _.flatten(results);
					})
					.then(items => {
						// Sort the results by the specified attribute.
						return items.sort((a, b) => {
							a = (a[sort] || 0).toString();
							b = (b[sort] || 0).toString();

							if (a > b) {
								return descending ? -1 : 1;
							}
							if (b > a) {
								return descending ? 1 : -1;
							}

							return 0;
						});
					})
					.then(items => {
						// No fancy paging logic. Just return first n items the old way.
						if (!args.lastEvalutatedKey) {
							return items.slice(0, limit);
						}

						// Otherwise, we need to do the fancy paging logic.

						let start;
						let end;
						let results;

						if (lastEvalutatedKey) {
							start = _.findIndex(items, item => {
								return item.id === lastEvalutatedKey;
							});

							// Add 1 to the last evaluated key index (so it's exlclusive).
							start += 1;

							end = start + limit;
							results = items.slice(start, end);
						} else {
							// Add 1 to the last evaluated key index (so it's exlclusive).
							start = lastCursor + 1;

							end = start + limit;
							results = items.slice(start, end);
						}

						const key = _.last(items).id;
						const cursor = end - 1;

						return {results, lastEvalutatedKey: {key, cursor}};
					});
			}

			// Un-sorted results:

			// Establish the next cursor
			let cursor;

			// We need to scan up to the items we need but not too much beyond.
			return fetchKeysLimited(pattern, lastCursor, SCAN_PAGE_SIZE, limit)
				.then(res => {
					// Establish the next cursor
					cursor = res.cursor;

					// Fetch all the records in batches after scanning for the keys.
					const chunks = _.chunk(res.keys, HSCAN_CHUNK_SIZE);

					// Fetch batches in serial by .reduce() ing a chain of Promises.
					return chunks.reduce((promise, keys) => {
						return promise.then(() => {
							return hscanValues(keys);
						});
					}, Promise.resolve(null));
				})
				.then(results => {
					// Since we fetched items in chunks, we need to flatten the results
					// into a single Array.
					return _.flatten(results);
				})
				.then(results => {
					// No fancy paging logic. Just return first n items the old way.
					if (!args.lastEvalutatedKey) {
						return results.slice(0, limit);
					}

					// Otherwise, we need to do the fancy paging logic.
					// The limit the user passed in is used as a fuzzy guideline.
					// Chances are there are more results than limit.
					return {results, lastEvalutatedKey: {cursor}};
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
			payload.id = payload.id || uuid.v4();

			return hset(payload);
		};

		return set;
	}

	function setChannel(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.type = 'channel';
		payload.id = payload.id || uuid.v4();

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
	// https://github.com/oddnetworks/oddcast/issues/26
	//
	// args.channel - String *required*
	// args.keys - Array of {type, id} Objects
	bus.queryHandler(
		{role: 'store', cmd: 'batchGet', store: store.name},
		batchGet
	);

	return Promise.resolve(store);
};

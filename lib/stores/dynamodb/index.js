'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

// Namespace for helpers (see below).
const DynamoDB = {};
const hasOwn = Object.prototype.hasOwnProperty;

// bus - Oddcast Bus Object
// options.types - Array of String types *required*
// options.dynamodb - dynamodb connection Object *required*
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const types = options.types;
	const dynamodb = options.dynamodb;

	if (!Array.isArray(types) || types.length < 1) {
		throw new Error('The options.types Array is required.');
	}

	if (!dynamodb || !_.isObject(dynamodb)) {
		throw new Error('The options.dynamodb Connection Object is required.');
	}

	const store = {
		name: 'dynamodb-store',
		bus,
		options,
		types,
		dynamodb
	};

	// Normalized set implementation
	const putItem = (function () {
		let putItemAsync;

		if (_.isFunction(dynamodb.putItemAsync)) {
			putItemAsync = object => {
				return dynamodb
					.putItemAsync({TableName: object.type, Item: DynamoDB.serializeItem(object)})
					.then(_.constant(object));
			};
		} else {
			putItemAsync = object => {
				return new Promise((resolve, reject) => {
					dynamodb.putItem({TableName: object.type, Item: DynamoDB.serializeItem(object)}, err => {
						if (err) {
							return reject(err);
						}
						resolve(object);
					});
				});
			};
		}

		return putItemAsync;
	})();

	// Normalized hget implementation
	const getItem = (function () {
		let getItemAsync;

		if (_.isFunction(dynamodb.getItemAsync)) {
			getItemAsync = object => {
				const key = (object.channel) ? {id: object.id, channel: object.channel} : {id: object.id};
				return dynamodb
					.getItemAsync({TableName: object.type, Key: DynamoDB.serializeKey(key)})
					.then(res => {
						return (res && res.Item) ? DynamoDB.deserializeItem(res.Item) : null;
					});
			};
		} else {
			getItemAsync = object => {
				return new Promise((resolve, reject) => {
					const key = (object.channel) ? {id: object.id, channel: object.channel} : {id: object.id};
					dynamodb.getItem({TableName: object.type, Key: DynamoDB.serializeKey(key)}, (err, res) => {
						if (err) {
							return reject(err);
						}
						resolve(res && res.Item ? DynamoDB.deserializeItem(res.Item) : null);
					});
				});
			};
		}

		return getItemAsync;
	})();

	// Normalized hget implementation
	const deleteItem = (function () {
		let deleteItemAsync;

		if (_.isFunction(dynamodb.deleteItemAsync)) {
			deleteItemAsync = object => {
				const key = (object.channel) ? {id: object.id, channel: object.channel} : {id: object.id};
				return dynamodb
					.deleteItemAsync({TableName: object.type, Key: DynamoDB.serializeKey(key)})
					.then(res => {
						return Boolean(res);
					});
			};
		} else {
			deleteItemAsync = object => {
				return new Promise((resolve, reject) => {
					const key = (object.channel) ? {id: object.id, channel: object.channel} : {id: object.id};
					dynamodb.deleteItem({TableName: object.type, Key: DynamoDB.serializeKey(key)}, (err, res) => {
						if (err) {
							return reject(err);
						}
						resolve(Boolean(res));
					});
				});
			};
		}

		return deleteItemAsync;
	})();

	// Normalized hscan implementation
	const scan = (function () {
		let scanAsync;

		if (_.isFunction(dynamodb.queryAync)) {
			scanAsync = args => {
				let promise = dynamodb
					.scanAync({
						TableName: args.type,
						Limit: args.limit
					});

				if (args.channel) {
					promise = dynamodb
						.queryAync({
							TableName: args.type,
							KeyConditionExpression: 'channel = :channel',
							ExpressionAttributeValues: {
								':channel': {S: args.channel}
							},
							Limit: args.limit
						});
				}

				return promise;
			};
		} else {
			scanAsync = args => {
				let promise = new Promise((resolve, reject) => {
					dynamodb.scan({
						TableName: args.type,
						Limit: args.limit
					}, (err, res) => {
						if (err) {
							return reject(err);
						}
						resolve(res.Items.map(DynamoDB.deserializeItem));
					});
				});

				if (args.channel) {
					promise = new Promise((resolve, reject) => {
						dynamodb.query({
							TableName: args.type,
							KeyConditionExpression: 'channel = :channel',
							ExpressionAttributeValues: {
								':channel': {S: args.channel}
							},
							Limit: args.limit
						}, (err, res) => {
							if (err) {
								return reject(err);
							}
							resolve(res.Items.map(DynamoDB.deserializeItem));
						});
					});
				}

				return promise;
			};
		}

		return scanAsync;
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

			return putItem(payload);
		};

		return set;
	}

	function setChannel(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.type = 'channel';
		payload.id = payload.id || uuid.v4();

		return putItem(payload);
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

			const promise = getItem({channel, type, id});

			// Get included entities if requested.
			if (include && include.length > 0) {
				return promise.then(entity => {
					if (!entity) {
						return entity;
					}

					if (!_.isArray(include)) {
						return Promise.reject(new Error('args.include must be an array.'));
					}

					const relationships = entity.relationships || {};

					const commands = _
						.flatten(include.map(key => {
							return (relationships[key] || {}).data || [];
						}))
						.map(item => {
							item = item || {};
							return getItem({channel, type: item.type, id: item.id});
						});

					return Promise.all(commands).then(res => {
						if (res.length > 0) {
							res = _.compact(res);
							entity.included = res;
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

		return getItem({type: 'channel', id: args.id});
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
			return deleteItem({channel, type, id});
		};

		return remove;
	}

	function removeChannel(args) {
		args = args || {};
		if (!args.id || !_.isString(args.id)) {
			return Promise.reject(new Error('args.id String is required.'));
		}

		return deleteItem({type: 'channel', id: args.id});
	}

	function createScanner(type) {
		const _scan = args => {
			args = args || {};
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('scan() args.channel String is required.'));
			}

			const limit = parseInt(args.limit, 10) || 10;

			return scan({channel: args.channel, type, limit});
		};

		return _scan;
	}

	function scanChannels(args) {
		args = args || {};
		const limit = parseInt(args.limit, 10) || 10;
		return scan({type: 'channel', limit});
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
			return getItem({channel, type: arg.type, id: arg.id});
		});

		return Promise
			// Need to inspect all the getItem promises since DynamoDB sends an error when a record is not found
			.all(commands.map(promise => promise.reflect()))
			.then(reflections => {
				return _.map(reflections, result => {
					return result.isFulfilled() ? result.value() : null;
				});
			})
			.then(res => {
				if (res.length > 0) {
					res = _.compact(res);
					return res;
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
			return getItem({type, id: arg.id});
		});

		return Promise.all(commands).then(res => {
			if (res.length > 0) {
				res = _.compact(res);
				return res;
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

function serializeItem(attrs) {
	return Object.keys(attrs).reduce((rec, key) => {
		const val = DynamoDB.typeCast(attrs[key]);
		if (val) {
			rec[key] = val;
		}
		return rec;
	}, {});
}

DynamoDB.serializeItem = serializeItem;

function deserializeItem(obj) {
	return Object.keys(obj).reduce((rv, key) => {
		rv[key] = DynamoDB.deserializeAttribute(obj[key]);
		return rv;
	}, {});
}

DynamoDB.deserializeItem = deserializeItem;

function deserializeAttribute(val) {
	if (hasOwn.call(val, 'S')) {
		return val.S.toString();
	} else if (hasOwn.call(val, 'N')) {
		return parseFloat(val.N);
	} else if (val.SS || val.NS) {
		return val.SS || val.NS;
	} else if (hasOwn.call(val, 'BOOL')) {
		return Boolean(val.BOOL);
	} else if (hasOwn.call(val, 'M')) {
		return DynamoDB.deserializeItem(val.M);
	} else if (hasOwn.call(val, 'L')) {
		return val.L.map(DynamoDB.deserializeAttribute);
	} else if (hasOwn.call(val, 'NULL')) {
		return null;
	}
}

DynamoDB.deserializeAttribute = deserializeAttribute;

function typeCast(obj) {
	switch (typeof obj) {
		case 'string':
			if (obj.length === 0) {
				return null;
			}
			return {S: obj};
		case 'number':
			if (isNaN(obj)) {
				return null;
			}
			return {N: obj.toString()};
		case 'boolean':
			return {BOOL: obj};
		case 'function':
		case 'undefined':
			return null;
		default:
			if (!obj) {
				return {NULL: true};
			}
			return Array.isArray(obj) ? DynamoDB.typeCastArray(obj) : DynamoDB.typeCastObject(obj);
	}
}

DynamoDB.typeCast = typeCast;

function typeCastArray(obj) {
	return {L: obj.map(DynamoDB.typeCast).filter(item => {
		return Boolean(item);
	})};
}

DynamoDB.typeCastArray = typeCastArray;

function typeCastObject(obj) {
	const keys = Object.keys(obj);
	const rv = {M: {}};

	if (keys.length === 0) {
		return rv;
	}

	rv.M = keys.reduce((M, key) => {
		const val = DynamoDB.typeCast(obj[key]);
		if (val) {
			M[key] = val;
		}
		return M;
	}, rv.M);

	return rv;
}

DynamoDB.typeCastObject = typeCastObject;

function serializeKey(obj) {
	return Object.keys(obj).reduce((keys, key) => {
		keys[key] = DynamoDB.typeCastKey(obj[key]);
		return keys;
	}, {});
}

DynamoDB.serializeKey = serializeKey;

function typeCastKey(obj) {
	const type = typeof obj;

	switch (type) {
		case 'string':
			return {S: obj};
		case 'number':
			return {N: obj.toString()};
		case 'boolean':
			return {BOOL: obj};
		default:
			throw new TypeError(
				`Only String, Number or Boolean attributes (not ${type}) may be defined on keys in DynamoDB Engine.`
			);
	}
}

DynamoDB.typeCastKey = typeCastKey;

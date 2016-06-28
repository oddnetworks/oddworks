'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

const dynamodbMarshaler = require('dynamodb-marshaler');

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

	if (!Array.isArray(types) || !types.length) {
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
					.putItemAsync({TableName: object.type, Item: dynamodbMarshaler.marshalItem(object)})
					.then(_.constant(object));
			};
		} else {
			putItemAsync = object => {
				return new Promise((resolve, reject) => {
					dynamodb.putItem({TableName: object.type, Item: dynamodbMarshaler.marshalItem(object)}, err => {
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
					.getItemAsync({TableName: object.type, Key: dynamodbMarshaler.marshalItem(key)})
					.then(res => {
						return (res && res.Item) ? dynamodbMarshaler.unmarshalItem(res.Item) : null;
					});
			};
		} else {
			getItemAsync = object => {
				return new Promise((resolve, reject) => {
					const key = (object.channel) ? {id: object.id, channel: object.channel} : {id: object.id};
					dynamodb.getItem({TableName: object.type, Key: dynamodbMarshaler.marshalItem(key)}, (err, res) => {
						if (err) {
							return reject(err);
						}
						resolve(res ? dynamodbMarshaler.unmarshalItem(res.Item) : null);
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
					.deleteItemAsync({TableName: object.type, Key: dynamodbMarshaler.marshalItem(key)})
					.then(res => {
						return Boolean(res);
					});
			};
		} else {
			deleteItemAsync = object => {
				return new Promise((resolve, reject) => {
					const key = (object.channel) ? {id: object.id, channel: object.channel} : {id: object.id};
					dynamodb.deleteItem({TableName: object.type, Key: dynamodbMarshaler.marshalItem(key)}, (err, res) => {
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
						resolve(res.Items.map(dynamodbMarshaler.unmarshalItem));
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
							resolve(res.Items.map(dynamodbMarshaler.unmarshalItem));
						});
					});
				}

				return promise;
			};
		}

		return scanAsync;
	})();

	function createSetter(type) {
		return function set(payload) {
			if (!payload.channel || !_.isString(payload.channel)) {
				return Promise.reject(new Error('set() payload.channel String is required.'));
			}

			// Make a copy to prevent unintended mutation.
			payload = _.cloneDeep(payload);
			payload.type = type;
			payload.id = payload.id || uuid.v4();

			return putItem(payload);
		};
	}

	function setChannel(payload) {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.type = 'channel';
		payload.id = payload.id || uuid.v4();

		return putItem(payload);
	}

	function createGetter(type) {
		return function get(args) {
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
							return getItem({channel, type: item.type, id: item.id});
						});

					return Promise.all(commands).then(res => {
						if (res.length) {
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
	}

	function getChannel(args) {
		args = args || {};
		if (!args.id || !_.isString(args.id)) {
			return Promise.reject(new Error('args.id String is required.'));
		}

		return getItem({type: 'channel', id: args.id});
	}

	function createRemover(type) {
		return function remove(args) {
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
	}

	function removeChannel(args) {
		args = args || {};
		if (!args.id || !_.isString(args.id)) {
			return Promise.reject(new Error('args.id String is required.'));
		}

		return deleteItem({type: 'channel', id: args.id});
	}

	function createScanner(type) {
		return function _scan(args) {
			args = args || {};
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('scan() args.channel String is required.'));
			}

			const limit = parseInt(args.limit, 10) || 10;

			return scan({channel: args.channel, type, limit});
		};
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

		if (!keys.length) {
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
				if (res.length) {
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

		if (!keys.length) {
			return Promise.resolve([]);
		}

		const commands = keys.map(arg => {
			return getItem({type, id: arg.id});
		});

		return Promise.all(commands).then(res => {
			if (res.length) {
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

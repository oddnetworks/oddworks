'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('uuid/v4');

// bus - Oddcast Bus Object
// options.types - Array of String types *required*
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const types = options.types;

	if (!Array.isArray(types) || types.length < 1) {
		throw new Error('The options.types Array is required.');
	}

	const CACHE = Object.create(null);
	CACHE.channel = Object.create(null);

	const store = {
		name: 'memory-store',
		bus,
		options,
		types,
		cache: CACHE
	};

	function createSetter(type) {
		const set = val => {
			if (!val.channel || !_.isString(val.channel)) {
				return Promise.reject(new Error('The val.channel String is required.'));
			}

			const channel = val.channel;

			if (!CACHE[channel]) {
				CACHE[channel] = Object.create(null);
			}
			const scope = CACHE[channel];

			if (!scope[type]) {
				scope[type] = Object.create(null);
			}
			const table = scope[type];

			// Make a copy to prevent unintended mutation.
			val = _.cloneDeep(val);
			val.id = val.id || uuid();
			val.type = type;
			table[val.id] = val;
			return Promise.resolve(_.cloneDeep(val));
		};

		return set;
	}

	function setChannel(val) {
		// Make a copy to prevent unintended mutation.
		val = _.cloneDeep(val);
		val.id = val.id || uuid();
		val.type = 'channel';
		CACHE.channel[val.id] = val;
		return Promise.resolve(_.cloneDeep(val));
	}

	function createGetter(type) {
		const get = args => {
			args = args || {};
			if (!args.id || !_.isString(args.id)) {
				return Promise.reject(new Error('The args.id String is required.'));
			}
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('The args.channel String is required.'));
			}

			const id = args.id;
			const channel = args.channel;
			const include = args.include;

			const scope = CACHE[channel] || Object.create(null);
			const table = scope[type] || Object.create(null);

			// Make a copy to prevent unintended mutation.
			const entity = table[id] ? _.cloneDeep(table[id]) : null;

			if (entity && include && include.length > 0) {
				const relationships = entity.relationships || Object.create(null);

				if (!_.isArray(include)) {
					return Promise.reject(new Error('args.include must be an array.'));
				}

				entity.included = _(include.map(key => {
					return (relationships[key] || {}).data || [];
				}))
				.flatten()
				.map(item => {
					const table = scope[item.type] || Object.create(null);

					// Make a copy to prevent unintended mutation.
					return table[item.id] ? _.cloneDeep(table[item.id]) : null;
				})
				.compact()
				.value();
			}

			return Promise.resolve(entity);
		};

		return get;
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

			const scope = CACHE[channel] || Object.create(null);
			const table = scope[type] || Object.create(null);

			if (table[id]) {
				delete table[id];
				return Promise.resolve(true);
			}
			return Promise.resolve(false);
		};

		return remove;
	}

	function getChannel(args) {
		args = args || {};
		if (!args.id || !_.isString(args.id)) {
			return Promise.reject(new Error('The args.id String is required.'));
		}

		const id = args.id;
		const entity = CACHE.channel[id] ? _.cloneDeep(CACHE.channel[id]) : null;
		return Promise.resolve(entity);
	}

	function createScanner(type) {
		const scan = args => {
			args = args || {};
			if (!args.channel || !_.isString(args.channel)) {
				return Promise.reject(new Error('The args.channel String is required.'));
			}
			const limit = parseInt(args.limit, 10) || 10;

			const channel = args.channel;
			const scope = CACHE[channel] || Object.create(null);
			const table = scope[type] || Object.create(null);

			// Make a copy to prevent unintended mutation.
			const all = _.toArray(_.cloneDeep(table));
			return Promise.resolve(all.slice(0, limit));
		};

		return scan;
	}

	function scanChannels(args) {
		const limit = parseInt(args.limit, 10) || 10;
		// Make a copy to prevent unintended mutation.
		const all = _.toArray(_.cloneDeep(CACHE.channel));
		return Promise.resolve(all.slice(0, limit));
	}

	function batchGet(args) {
		args = args || {};
		if (!args.channel || !_.isString(args.channel)) {
			return Promise.reject(new Error('The args.channel String is required.'));
		}
		if (!Array.isArray(args.keys)) {
			throw new Error('batchGet() args.keys must be an Array.');
		}

		const channel = args.channel;
		const keys = args.keys;

		if (keys.length < 1) {
			return Promise.resolve([]);
		}

		const scope = CACHE[channel] || Object.create(null);

		const results = keys.map(arg => {
			const table = scope[arg.type] || Object.create(null);
			const id = arg.id;
			// Make a copy to prevent unintended mutation.
			return table[id] ? _.cloneDeep(table[id]) : null;
		});

		return Promise.resolve(_.compact(results));
	}

	function batchGetChannel(args) {
		args = args || {};
		if (!Array.isArray(args.keys)) {
			throw new Error('batchGetChannel() args.keys must be an Array.');
		}

		const keys = args.keys;

		if (keys.length < 1) {
			return Promise.resolve([]);
		}

		const table = CACHE.channel;

		const results = keys.map(arg => {
			const id = arg.id;
			// Make a copy to prevent unintended mutation.
			return table[id] ? _.cloneDeep(table[id]) : null;
		});

		return Promise.resolve(_.compact(results));
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

'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

// bus - Oddcast Bus Object
// options.types - Array of String types *required*
exports.initialize = function createMemoryStore(bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = options || {};
	const types = options.types;

	if (!Array.isArray(types) || !types.length) {
		throw new Error('The options.types Array is required.');
	}

	const STORE = types.reduce((store, type) => {
		store[type] = Object.create(null);
		return store;
	}, Object.create(null));

	function createSetter(type) {
		const table = STORE[type] || Object.create(null);

		return function set(val) {
			// Make a copy to prevent unintended mutation.
			val = _.cloneDeep(val);
			val.id = val.id || uuid.v4();
			val.type = type;
			table[val.id] = val;
			return Promise.resolve(val);
		};
	}

	function createGetter(type) {
		const table = STORE[type] || Object.create(null);

		return function get(args) {
			args = args || {};
			if (!args.id || !_.isString(args.id)) {
				return Promise.reject(new Error('The args.id String is required.'));
			}
			const id = args.id;
			const include = args.include;

			// Make a copy to prevent unintended mutation.
			const entity = table[id] ? _.cloneDeep(table[id]) : null;

			if (entity && include && include.length) {
				const relationships = entity.relationships || Object.create(null);
				entity.included = _(include.map(key => {
					return (relationships[key] || {}).data || [];
				}))
				.flatten()
				.map(item => {
					const table = STORE[item.type] || Object.create(null);

					// Make a copy to prevent unintended mutation.
					return table[item.id] ? _.cloneDeep(table[item.id]) : null;
				})
				.compact()
				.value();
			}

			return Promise.resolve(entity);
		};
	}

	function createScanner(type) {
		const table = STORE[type] || Object.create(null);

		return function scan(args) {
			args = args || {};
			const limit = parseInt(args.limit, 10) || 10;

			// Make a copy to prevent unintended mutation.
			const all = _.toArray(_.cloneDeep(table));
			return Promise.resolve(all.slice(0, limit));
		};
	}

	types.forEach(type => {
		// args.id - String *required*
		// args.include - Array of String types to include
		bus.queryHandler({role: 'store', cmd: 'get', type}, createGetter(type));

		// args.limit - Number *default == 10*
		bus.queryHandler({role: 'store', cmd: 'scan', type}, createScanner(type));

		// payload - Object
		bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(type));
	});

	return Promise.resolve(true);
};

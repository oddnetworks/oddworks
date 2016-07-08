'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

// service.options.updateFrequency - Number > 0 < 1 *default === 1*
module.exports = function (service) {
	const queries = Object.create(null);

	const options = _.defaults({}, service.options, {
		updateFrequency: 1
	});

	const UPDATE_FREQ = options.updateFrequency;

	// args.channel - Object *required*
	// args.type - String *required*
	// args.id - String *required*
	// args.platform - Object *required*
	// args.user - Object
	// args.include - Array of String types to include
	queries.fetchItem = function fetchItem(args) {
		args = args || {};

		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}
		if (!args.id || !_.isString(args.id)) {
			throw new Error('args.id is required');
		}
		if (!args.platform || !_.isObject(args.platform)) {
			throw new Error('args.platform is required');
		}

		const type = args.type;
		const id = args.id;
		const channel = args.channel;
		const platform = args.platform;
		const user = args.user;

		const payload = {
			channel: channel.id,
			type,
			id
		};

		if (Array.isArray(args.include) && args.include.length) {
			payload.include = args.include;
		}

		return service.bus
			.query({role: 'store', cmd: 'get', type}, payload)
			.then(object => {
				if (!object) {
					return null;
				}

				return service.bus
					.query({role: 'identity', cmd: 'config'}, {channel, platform, user})
					.then(meta => {
						// TODO: Bring back string interpolation
						// https://github.com/oddnetworks/oddworks/issues/95
						object.meta = _.merge({}, meta, object.meta);

						return checkCache(object).then(resource => {
							// Update the meta again.
							// TODO: Bring back string interpolation
							// https://github.com/oddnetworks/oddworks/issues/95
							const config = _.merge({}, meta, resource.meta);
							resource.meta = {
								user: config.user,
								features: config.features,
								maxAge: config.maxAge,
								staleWhileRevalidate: config.staleWhileRevalidate,
								updatedAt: config.updatedAt
							};
							return resource;
						});
					});
			});
	};

	function checkCache(object) {
		const now = _.now();

		// maxAge and staleWhileRevalidate are in seconds (so we multiply by 1000)

		const maxAge = parseInt(object.meta.maxAge, 10) ?
			(object.meta.maxAge * 1000) : false;

		// Only go through the cache pipeline if caching is configured for
		// this object.
		if (object.spec && maxAge) {
			// If new Date() is invalid, .getTime() returns NaN.
			const updatedAt = (new Date(object.meta.updatedAt)).getTime() || 0;
			const expiration = maxAge + updatedAt;
			const staleWindow = (object.meta.staleWhileRevalidate || 0) * 1000;
			const update = now > expiration;

			const promise = (now > (expiration + staleWindow)) ?
				queries.fetchItemSource(object) : null;

			if (promise) {
				return promise;
			}

			const updateFrequency = _.isNumber((object.meta || {}).updateFrequency) ?
				object.meta.updateFrequency : UPDATE_FREQ;
			// If this is one of many nodes in the system, we don't want to send an
			// angry mob to the source. An updateFrequency of 1 will result in this
			// node requesting the resource 100% of the time, while an updateFrequency
			// of 0.1 will result in this node requesting the resource 10% of the time.
			if (update && Math.random() <= updateFrequency) {
				// Fetch resource in the background
				queries.fetchItemSource(object);
			}
		}

		return Promise.resolve(object);
	}

	queries.fetchItemSource = function fetchItemSource(object) {
		if (!object.channel || !_.isString(object.channel)) {
			throw new Error('expects object.channel to be present');
		}
		if (!object.type || !_.isString(object.type)) {
			throw new Error('expects object.type to be present');
		}
		if (!object.id || !_.isString(object.id)) {
			throw new Error('expects object.id to be present');
		}

		const channel = object.channel;
		const type = object.type;
		const specId = object.id.replace(/^res/, 'spec');
		const specType = `${object.type}Spec`;

		return queries.fetchItemSpec({channel, type: specType, id: specId})
			.then(spec => {
				if (!spec) {
					return null;
				}

				return service.bus.query(
					{role: 'provider', cmd: 'get', source: spec.source},
					{object, spec}
				);
			})
			.then(newObject => {
				if (newObject) {
					// Make sure the new object has all the correct properties.
					newObject = _.cloneDeep(newObject);
					newObject.channel = channel;
					newObject.type = type;
					newObject.id = object.id;
					newObject.spec = specId;

					return service.bus
						.sendCommand({role: 'catalog', cmd: 'setItem', type}, newObject);
				}

				// If the spec didn't exist, or the object did not exist at the source,
				// then remove it from the store.
				return service.bus.sendCommand(
					{role: 'catalog', cmd: 'removeItem', type},
					object
				);
			});
	};

	// args.channel - Object *required*
	// args.type - String *required*
	// args.platform - Object *required*
	// args.user - Object
	// args.include - Array of String types to include
	// args.limit - Number *default is 10*
	queries.fetchItemList = function fetchItemList(args) {
		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}
		if (!args.platform || !_.isObject(args.platform)) {
			throw new Error('args.platform is required');
		}

		const channel = args.channel;
		const type = args.type;
		const platform = args.platform;
		const user = args.user;
		const limit = parseInt(args.limit, 10) || 10;

		const payload = {
			channel: channel.id,
			type,
			limit
		};

		return service.bus
			.query({role: 'store', cmd: 'scan', type}, payload)
			.then(objects => {
				return Promise.all(objects.map(object => {
					return queries.fetchItem({
						channel,
						type,
						id: object.id,
						platform,
						user,
						include: args.include
					});
				}));
			});
	};

	// args.channel - String *required*
	// args.type - String *required*
	// args.id - String *required*
	queries.fetchItemSpec = function fetchItemSpec(args) {
		args = args || {};

		if (!args.channel || !_.isString(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}
		if (!args.id || !_.isString(args.id)) {
			throw new Error('args.id is required');
		}

		const channel = args.channel;
		const type = args.type;
		const id = args.id;

		return service.bus
			.query({role: 'store', cmd: 'get', type}, {channel, type, id});
	};

	// args.channel - String *required*
	// args.type - String *required*
	// args.limit - Number *default is 10*
	queries.fetchItemSpecList = function fetchItemSpecList(args) {
		args = args || {};

		if (!args.channel || !_.isString(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}

		const channel = args.channel;
		const type = `${args.type}Spec`;
		const limit = parseInt(args.limit, 10) || 10;

		const payload = {
			channel: channel.id,
			type,
			limit
		};

		return service.bus
			.query({role: 'store', cmd: 'scan', type}, payload);
	};

	return queries;
};

'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const debug = require('debug')('oddworks:catalog:query');

const RESOURCE_FEATURES = [
	'ads',
	'player',
	'sharing',
	'overlay'
];

// service.options.updateFrequency - Number > 0 < 1 *default === 1*
// service.options.resourceFeatures - Array of Strings
module.exports = function (service) {
	const queries = Object.create(null);

	const options = _.defaults({}, service.options, {
		updateFrequency: 1,
		resourceFeatures: RESOURCE_FEATURES
	});

	const UPDATE_FREQ = options.updateFrequency;
	const FEATURES = options.resourceFeatures;

	// args.channel - Object *required*
	// args.type - String *required*
	// args.id - String *required*
	// args.platform - Object
	// args.viewer - Object
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

		const type = args.type;
		const id = args.id;
		const channel = args.channel;
		const platform = args.platform;
		const viewer = args.viewer;

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
					.query({role: 'identity', cmd: 'config'}, {channel, platform, viewer})
					.then(meta => {
						// TODO: Bring back string interpolation
						// https://github.com/oddnetworks/oddworks/issues/95
						object.meta = _.merge({}, meta, object.meta);

						return checkCache(service.bus, channel, object).then(resource => {
							// Update the meta again.
							// TODO: Bring back string interpolation
							// https://github.com/oddnetworks/oddworks/issues/95
							const config = _.merge({}, meta, resource.meta);
							resource.meta = assignObjectMeta(config);

							// Assign meta to included entities
							if (resource.included && resource.included.length) {
								resource.included = resource.included.map(res => {
									res.meta = assignObjectMeta(_.merge({}, meta, res.meta));
									return res;
								});
							}
							return resource;
						});
					});
			});
	};

	function assignObjectMeta(config) {
		const features = _.pick(config.features, FEATURES);
		const rv = _.omit(config, [
			'active',
			'platformType',
			'category',
			'views',
			'type',
			'id',
			'channel',
			'platform'
		]);

		rv.features = features;
		return rv;
	}

	function checkCache(bus, channel, object) {
		const now = _.now();

		function handleSourceError(err) {
			const event = {
				code: 'UPSTREAM_FAILURE',
				spec: object.spec,
				message: 'upstream source failed',
				error: err
			};

			bus.broadcast({level: 'error'}, event);
			return object;
		}

		// maxAge and staleWhileRevalidate are in seconds (so we multiply by 1000)

		const maxAge = parseInt(object.meta.maxAge, 10) ?
			(object.meta.maxAge * 1000) : false;

		debug(`checkCache ${object.id} maxAge ${maxAge}`);
		debug(`checkCache ${object.id} spec ${Boolean(object.spec)}`);

		// Only go through the cache pipeline if caching is configured for
		// this object.
		if (object.spec && maxAge) {
			// If new Date() is invalid, .getTime() returns NaN.
			const updatedAt = (new Date(object.meta.updatedAt)).getTime() || 0;
			const expiration = maxAge + updatedAt;
			const staleWindow = (object.meta.staleWhileRevalidate || 0) * 1000;
			const update = now > expiration;
			debug(`checkCache ${object.id} update ${update}`);

			const promise = (now > (expiration + staleWindow)) ?
				fetchItemSource(channel, object) : null;

			if (promise) {
				debug(`checkCache ${object.id} stale has expired`);
				return promise.catch(handleSourceError);
			}

			const updateFrequency = _.isNumber(object.meta.updateFrequency) ?
				object.meta.updateFrequency : UPDATE_FREQ;
			// If this is one of many nodes in the system, we don't want to send an
			// angry mob to the source. An updateFrequency of 1 will result in this
			// node requesting the resource 100% of the time, while an updateFrequency
			// of 0.1 will result in this node requesting the resource 10% of the time.
			debug(`checkCache ${object.id} updateFrequency ${updateFrequency}`);
			if (update && Math.random() <= updateFrequency) {
				// Fetch resource in the background
				debug(`checkCache ${object.id} fetching in background`);
				fetchItemSource(channel, object).catch(handleSourceError);
			}
		} else {
			debug(`checkCache ${object.id} false`);
		}

		return Promise.resolve(object);
	}

	function fetchItemSource(channel, object) {
		const type = object.type;
		const specId = object.id.replace(/^res/, 'spec');
		const specType = `${object.type}Spec`;

		return queries.fetchItemSpec({channel, type: specType, id: specId})
			.then(spec => {
				if (!spec) {
					debug(`fetchItemSource ${specId} not found`);
					return null;
				}

				debug(`fetchItemSource ${specId} using provider ${spec.source}`);
				return service.bus.query(
					{role: 'provider', cmd: 'get', source: spec.source},
					{object, spec}
				);
			})
			.then(newObject => {
				if (newObject) {
					// Make sure the new object has all the correct properties.
					newObject = _.cloneDeep(newObject);
					newObject.channel = channel.id;
					newObject.type = type;
					newObject.id = object.id;
					newObject.spec = specId;

					debug(`fetchItemSource ${specId} got resource object ${type}:${object.id}`);
					return service.bus
						.sendCommand({role: 'catalog', cmd: 'setItem', type}, newObject);
				}

				debug(`fetchItemSource ${specId} resource object not found ${type}:${object.id}`);

				// If the spec didn't exist, or the object did not exist at the source,
				// then remove it from the store.
				return service.bus.sendCommand(
					{role: 'catalog', cmd: 'removeItem', type},
					object
				).then(_.constant(object));
			});
	}

	// args.channel - Object *required*
	// args.type - String *required*
	// args.platform - Object *required*
	// args.viewer - Object
	// args.include - Array of String types to include
	// args.limit - Number *default is 10*
	queries.fetchItemList = function fetchItemList(args) {
		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}

		const channel = args.channel;
		const type = args.type;
		const platform = args.platform;
		const viewer = args.viewer;
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
						viewer,
						include: args.include
					});
				}));
			});
	};

	// args.channel - Object *required*
	// args.type - String *required*
	// args.id - String *required*
	queries.fetchItemSpec = function fetchItemSpec(args) {
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

		const channel = args.channel.id;
		const type = args.type;
		const id = args.id;

		return service.bus
			.query({role: 'store', cmd: 'get', type}, {channel, type, id});
	};

	// args.channel - Object *required*
	// args.type - String *required*
	// args.limit - Number *default is 10*
	queries.fetchItemSpecList = function fetchItemSpecList(args) {
		args = args || {};

		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}

		const channel = args.channel.id;
		const type = `${args.type}Spec`;
		const limit = parseInt(args.limit, 10) || 10;

		return service.bus
			.query({role: 'store', cmd: 'scan', type}, {channel, type, limit});
	};

	return queries;
};

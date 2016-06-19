'use strict';

const _ = require('lodash');

exports.fetchItem = function (service) {
	// args.channel - Object *required*
	// args.platform - Object *required*
	// args.type - String *required*
	// args.id - String *required*
	// args.user - Object
	// args.include - Array of String types to include
	return function fetchItem(args) {
		args = args || {};

		if (!args.type || !_.isString(args.type)) {
			throw new Error('fetchItem() args.type is required');
		}
		if (!args.id || !_.isString(args.id)) {
			throw new Error('fetchItem() args.id is required');
		}
		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('fetchItem() args.channel is required');
		}
		if (!args.platform || !_.isObject(args.platform)) {
			throw new Error('fetchItem() args.platform is required');
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
				return service.bus
					.query({role: 'identity', cmd: 'config'}, {channel, platform, user})
					.then(meta => {
						object.meta = _.merge({}, object.meta, meta);
						return object;
					});
			});
	};
};

exports.fetchList = function (service) {
	// args.channel - Object *required*
	// args.platform - Object *required*
	// args.type - String *required*
	// args.user - Object
	// args.include - Array of String types to include
	// args.limit - Number *default is 10*
	return function fetchList(args) {
		if (!args.type || !_.isString(args.type)) {
			throw new Error('fetchList() args.type is required');
		}
		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('fetchItem() args.channel is required');
		}
		if (!args.platform || !_.isObject(args.platform)) {
			throw new Error('fetchItem() args.platform is required');
		}

		const type = args.type;
		const channel = args.channel;
		const platform = args.platform;
		const user = args.user;
		const limit = parseInt(args.limit, 10) || 10;

		const payload = {
			channel: channel.id,
			type,
			limit
		};

		if (Array.isArray(args.include) && args.include.length) {
			payload.include = args.include;
		}

		return service.bus
			.query({role: 'store', cmd: 'scan', type}, payload)
			.then(objects => {
				return service.bus
					.query({role: 'identity', cmd: 'config'}, {channel, platform, user})
					.then(meta => {
						return objects.map(object => {
							object.meta = _.merge({}, object.meta, meta);
							return object;
						});
					});
			});
	};
};

exports.fetchCollectionConfig = function (service) {
	// args.channel - String *required*
	// args.id - String *required*
	return function fetchItemConfig(args) {
		args = args || {};

		if (!args.id || !_.isString(args.id)) {
			throw new Error('fetchCollectionConfig() args.id is required');
		}
		if (!args.channel || !_.isString(args.channel)) {
			throw new Error('fetchCollectionConfig() args.channel is required');
		}

		const id = args.id;
		const channel = args.channel;
		const type = 'collectionConfig';

		return service.bus
			.query({role: 'store', cmd: 'get', type}, {channel, id});
	};
};

exports.fetchCollectionConfigList = function (service) {
	// args.channel - String *required*
	// args.limit - Number *default is 10*
	return function fetchItemConfig(args) {
		args = args || {};

		if (!args.channel || !_.isString(args.channel)) {
			throw new Error('fetchCollectionConfigList() args.channel is required');
		}

		const channel = args.channel;
		const type = 'collectionConfig';
		const limit = parseInt(args.limit, 10) || 10;

		return service.bus
			.query({role: 'store', cmd: 'scan', type}, {channel, type, limit});
	};
};

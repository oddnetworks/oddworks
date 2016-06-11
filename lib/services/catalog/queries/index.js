'use strict';

const _ = require('lodash');

const lib = require('../lib/');

exports.fetchItem = function (service) {
	// args.type - String *required*
	// args.id - String *required*
	// args.decorate - Boolean
	// args.channel = String channel ID *required if decorate is true*
	// args.platform = String platform ID *required if decorate is true*
	return function fetchItem(args) {
		const decorate = Boolean(args.decorate);

		if (!args.type || !_.isString(args.type)) {
			throw new Error('fetchItem() args.type is required');
		}
		if (!args.id || !_.isString(args.id)) {
			throw new Error('fetchItem() args.id is required');
		}

		if (decorate) {
			if (!args.channel || !_.isString(args.channel)) {
				throw new Error('fetchItem() args.channel is required');
			}
			if (!args.platform || !_.isString(args.platform)) {
				throw new Error('fetchItem() args.platform is required');
			}
		}

		const id = args.id;

		return service.bus
			.query({role: 'store', cmd: 'get', type: args.type}, {id})
			.then(object => {
				if (decorate) {
					return service.bus
						.query({role: 'identity', cmd: 'config'}, args)
						.then(config => {
							_.set(
								object,
								'meta.features',
								lib.composeMetaFeatures(object, config.features)
							);

							return object;
						});
				}

				return object;
			});
	};
};

exports.fetchList = function (service) {
	// args.type - String *required*
	// args.limit - Number *default is 10*
	// args.decorate - Boolean
	// args.channel = String channel ID *required if decorate is true*
	// args.platform = String platform ID *required if decorate is true*
	return function fetchList(args) {
		const limit = parseInt(args.limit, 10) || 10;
		const decorate = Boolean(args.decorate);

		if (!args.type || !_.isString(args.type)) {
			throw new Error('fetchList() args.type is required');
		}

		if (decorate) {
			if (!args.channel || !_.isString(args.channel)) {
				throw new Error('fetchList() args.channel is required');
			}
			if (!args.platform || !_.isString(args.platform)) {
				throw new Error('fetchList() args.platform is required');
			}
		}

		return service.bus
			.query({role: 'store', cmd: 'scan', type: args.type}, {limit})
			.then(objects => {
				if (decorate) {
					return service.bus
						.query({role: 'identity', cmd: 'config'}, args)
						.then(config => {
							return objects.map(object => {
								_.set(
									object,
									'meta.features',
									lib.composeMetaFeatures(object, config.features)
								);

								return object;
							});
						});
				}

				return objects;
			});
	};
};

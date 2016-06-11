'use strict';

const _ = require('lodash');
const jwt = require('jsonwebtoken');

// service.bus
// service.options.jwtSecret
exports.verify = function (service) {
	const bus = service.bus;
	const secret = service.options.jwtSecret;
	const role = 'store';
	const cmd = 'get';

	// args.token - JWT String *required*
	return function verify(args) {
		const token = args.token;

		return new Promise((resolve, reject) => {
			jwt.verify(token, secret, (err, object) => {
				if (err) {
					return reject(err);
				}

				const promise = Promise.all([
					bus.query({role, cmd, type: 'channel'}, {id: object.channel}),
					bus.query({role, cmd, type: 'platform'}, {id: object.platform})
				]);

				promise
					.then(results => {
						const channel = results[0];
						const platform = results[1];

						if (channel && platform) {
							resolve({channel, platform});
						} else if (channel) {
							reject(new Error('platform not found'));
						} else {
							reject(new Error('channel not found'));
						}
					})
					.catch(reject);
			});
		});
	};
};

// service.bus
// service.options.jwtSecret
exports.authenticate = function (service) {
	const bus = service.bus;
	const secret = service.options.jwtSecret;
	const query = {role: 'store', cmd: 'get', type: 'linked-platform'};

	// args.token - JWT String *required*
	return function authenticate(args) {
		const token = args.token;

		return new Promise((resolve, reject) => {
			jwt.verify(token, secret, (err, object) => {
				if (err) {
					return reject(err);
				}

				const id = `${object.channel}:${object.platform}:${object.user}`;
				return bus.query(query, {id}).then(resolve).catch(reject);
			});
		});
	};
};

// service.bus
exports.fetchConfig = function (service) {
	const bus = service.bus;
	const role = 'store';
	const cmd = 'get';

	// args.channel - String *required*
	// args.platform - String *required*
	return function fetchConfig(args) {
		if (!args.channel || !_.isString(args.channel)) {
			throw new Error('fetchConfig() args.channel is required');
		}
		if (!args.platform || !_.isString(args.platform)) {
			throw new Error('fetchConfig() args.platform is required');
		}

		const promise = Promise.all([
			bus.query({role, cmd, type: 'channel'}, {id: args.channel}),
			bus.query({role, cmd, type: 'platform'}, {id: args.platform})
		]);

		return promise.then(results => {
			const channel = results[0];
			const platform = results[1];

			const views = _.merge(
				{},
				channel.views || {},
				platform.views || {}
			);

			const features = _.merge(
				{},
				channel.features || {},
				platform.features || {}
			);

			return {features, views};
		});
	};
};

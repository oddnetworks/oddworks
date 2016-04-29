'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line
const boom = require('boom');
const jwt = require('jsonwebtoken');
Promise.promisifyAll(jwt);

const service= module.exports = {};
let config = {};

service.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options || {};

	config.bus.queryHandler({role: 'identity', cmd: 'verify'}, payload => {
		return new Promise((resolve, reject) => {
			jwt
				.verifyAsync(payload.token, config.options.jwtSecret)
				.then(token => {
					Promise
						.join(
							config.bus.query({role: 'store', cmd: 'get', type: 'channel'}, {id: token.channel, type: 'channel'}),
							config.bus.query({role: 'store', cmd: 'get', type: 'platform'}, {id: token.platform, type: 'platform'}),
							(channel, platform) => {
								if (!channel.length && !platform.length) {
									resolve({channel, platform});
								} else {
									reject(new Error('channel or platform not found'));
								}
							}
						);
				})
				.catch(err => reject(err));
		});
	});

	config.bus.queryHandler({role: 'identity', cmd: 'authenticate'}, payload => {
		return new Promise((resolve, reject) => {
			jwt
				.verifyAsync(payload.token, config.options.jwtSecret)
				.then(token => {
					const id = `${token.channel}:${token.platform}:${token.user}`;
					return config.bus.query({role: 'store', cmd: 'get', type: 'linked-platform'}, {id: id, type: 'linked-platform'});
				})
				.then(linkedplatform => resolve(linkedplatform))
				.catch(err => reject(err));
		});
	});

	config.bus.queryHandler({role: 'identity', cmd: 'user'}, payload => {
		return new Promise(resolve => {
			// Get the user from the whatever user management system, local or 3rd party depending on service config
			resolve(payload);
		});
	});

	config.bus.queryHandler({role: 'identity', cmd: 'config'}, payload => {
		return new Promise((resolve, reject) => {
			Promise
				.join(
					config.bus.query({role: 'store', cmd: 'get', type: 'channel'}, {id: payload.channel, type: 'channel'}),
					config.bus.query({role: 'store', cmd: 'get', type: 'platform'}, {id: payload.platform, type: 'platform'}),
					(channel, platform) => {
						if (!channel.length && !platform.length) {
							resolve(composeConfig({channel, platform}));
						} else {
							reject(new Error('channel or platform not found'));
						}
					}
				)
				.catch(err => reject(err));
		});
	});

	return Promise.resolve(true);
};

service.middleware = {
	verifyAccess(options) {
		return (req, res, next) => {
			const token = req.get(options.header || 'x-access-token');
			if (token) {
				config.bus
					.query({role: 'identity', cmd: 'verify'}, {token})
					.then(identity => {
						req.identity = identity;
						next();
					})
					.catch(() => next(boom.unauthorized('Invalid Access Token')));
			} else {
				next(boom.unauthorized('Invalid Access Token'));
			}
		};
	},

	authenticateUser(options) {
		return (req, res, next) => {
			const token = req.get(options.header);
			if (token) {
				config.bus
					.query({role: 'identity', cmd: 'authenticate'}, {token})
					.then(identity => {
						req.identity = identity;
						next();
					})
					.catch(() => next(boom.unauthorized('Invalid Authentication Token')));
			} else {
				next(boom.unauthorized('Invalid Authentication Token'));
			}
		};
	}
};

service.router = options => { // eslint-disable-line
	router.get(`/config`, (req, res, next) => {
		config.bus
			.query({role: 'identity', cmd: 'config'}, {channel: req.identity.channel.id, platform: req.identity.platform.id})
			.then(config => {
				res.body = {
					features: config.features,
					views: config.views
				};

				next();
			})
			.catch(err => next(boom.wrap(err)));
	});

	return router;
};

function composeConfig(identity) {
	const channelFeatures = _.keys(identity.channel.features);
	const platformFeatures = _.keys(identity.platform.features);
	const features = _.union(channelFeatures, platformFeatures);

	const confg = {
		features: {},
		views: identity.platform.views
	};

	_.each(features, key => {
		const channelKey = identity.channel.features[key];
		const platformKey = identity.platform.features[key];
		const mergedKey = _.merge({}, channelKey, platformKey);

		confg.features[key] = mergedKey;
	});

	return confg;
}

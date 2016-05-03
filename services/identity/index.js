'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line
const boom = require('boom');
const jwt = require('jsonwebtoken');
Promise.promisifyAll(jwt);

const respond = require('../../lib/respond');

const service = exports = module.exports = {};

service.name = 'identity';

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options || {};

	service.bus.queryHandler({role: 'identity', cmd: 'verify'}, payload => {
		return new Promise((resolve, reject) => {
			jwt
				.verifyAsync(payload.token, service.options.jwtSecret)
				.then(token => {
					return Promise
						.join(
							service.bus.query({role: 'store', cmd: 'get', type: 'channel'}, {id: token.channel, type: 'channel'}),
							service.bus.query({role: 'store', cmd: 'get', type: 'platform'}, {id: token.platform, type: 'platform'}),
							(channel, platform) => {
								if (!channel || !platform) {
									reject(new Error('channel or platform not found'));
								} else if (!channel.length && !platform.length) {
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

	service.bus.queryHandler({role: 'identity', cmd: 'authenticate'}, payload => {
		return new Promise((resolve, reject) => {
			jwt
				.verifyAsync(payload.token, service.options.jwtSecret)
				.then(token => {
					const id = `${token.channel}:${token.platform}:${token.user}`;
					return service.bus.query({role: 'store', cmd: 'get', type: 'linked-platform'}, {id: id, type: 'linked-platform'});
				})
				.then(linkedplatform => resolve(linkedplatform))
				.catch(err => reject(err));
		});
	});

	service.bus.queryHandler({role: 'identity', cmd: 'user'}, payload => {
		return new Promise(resolve => {
			// Get the user from the whatever user management system, local or 3rd party depending on service config
			resolve(payload);
		});
	});

	service.bus.queryHandler({role: 'identity', cmd: 'config'}, payload => {
		return new Promise((resolve, reject) => {
			Promise
				.join(
					service.bus.query({role: 'store', cmd: 'get', type: 'channel'}, {id: payload.channel, type: 'channel'}),
					service.bus.query({role: 'store', cmd: 'get', type: 'platform'}, {id: payload.platform, type: 'platform'}),
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
		options = options || {scopes: ['platform']};

		return (req, res, next) => {
			const token = req.get(options.header || 'x-access-token');
			if (token) {
				service.bus
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
				service.bus
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
	router.get('/config', (req, res, next) => {
		service.bus
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

	router.post('/:type(channels|platforms)', post);
	router.put('/:type(channels|platforms)/:id', put);
	router.patch('/:type(channels|platforms)/:id', patch);

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

function post(req, res, next) {
	const payload = req.body;
	service.bus.query({role: 'json-api', cmd: 'validate'}, payload)
		.then(() => {
			service.bus.sendCommand({role: 'store', cmd: 'set', type: payload.data.type}, payload);

			respond.accepted(res);
			next();
		})
		.catch(err => next(boom.badRequest(err.message)));
}

function put(req, res, next) {
	const payload = req.body;
	service.bus.query({role: 'json-api', cmd: 'validate'}, payload)
		.then(() => {
			service.bus.sendCommand({role: 'store', cmd: 'set', type: payload.data.type}, payload);

			respond.accepted(res);
			next();
		})
		.catch(err => next(boom.badRequest(err.message)));
}

function patch(req, res, next) {
	const payload = req.body;
	service.bus.query({role: 'json-api', cmd: 'validate'}, payload)
		.then(() => {
			return service.bus.query({role: 'store', cmd: 'get', type: payload.data.type}, payload.data);
		})
		.then(resource => {
			resource = _.assign(resource, payload.data.attributes);

			service.bus.sendCommand({role: 'store', cmd: 'set', type: payload.data.type}, resource);
		})
		.catch(err => next(boom.badRequest(err.message)));
}

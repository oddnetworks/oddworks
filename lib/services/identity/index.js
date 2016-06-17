'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line new-cap, babel/new-cap
const boom = require('boom');
const jwt = require('jsonwebtoken');

Promise.promisifyAll(jwt);

const respond = require('../../respond');

const service = exports = module.exports = {};

service.name = 'identity';

service.initialize = (bus, options) => {
	service.options = options || {};
	service.bus = bus;

	service.bus.queryHandler({role: 'identity', cmd: 'verify'}, payload => {
		return new Promise((resolve, reject) => {
			jwt
				.verifyAsync(payload.token, service.options.jwtSecret, {issuer: 'oddworks', audience: 'oddworks'})
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
	authorize() {
		return (req, res, next) => {
			const authHeader = req.get('Authorization');
			const token = authHeader.split(' ')[1];
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
	}
};

service.router = options => {
	options = options || {};
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

	router.get('/:type(channels|platforms)/:id?', get);
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

function get(req, res, next) {
	const type = req.params.type.substring(0, req.params.type.length - 1);

	service.bus
		.query({role: 'store', cmd: 'get', type}, {id: req.params.id, type})
		.then(resources => {
			respond.ok(res, resources);
			next();
		});
}

function post(req, res, next) {
	const payload = req.body;
	service.bus.sendCommand({role: 'store', cmd: 'set', type: payload.type}, payload);

	respond.accepted(res);
	next();
}

function put(req, res, next) {
	const payload = req.body;
	service.bus.sendCommand({role: 'store', cmd: 'set', type: payload.type}, payload);

	respond.accepted(res);
	next();
}

function patch(req, res, next) {
	const payload = req.body;

	service.bus
		.query({role: 'store', cmd: 'get', type: payload.type}, payload)
		.then(resource => {
			resource = _.assign(resource, payload);
			service.bus.sendCommand({role: 'store', cmd: 'set', type: resource.type}, resource);

			respond.accepted(res);
			next();
		});
}

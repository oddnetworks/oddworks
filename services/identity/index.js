'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line
const boom = require('boom');
const jwt = require('jsonwebtoken');
Promise.promisifyAll(jwt);

const service = exports = module.exports = {};
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
							config.bus.query({role: 'store', cmd: 'get', type: 'network'}, {id: token.network, type: 'network'}),
							config.bus.query({role: 'store', cmd: 'get', type: 'device'}, {id: token.device, type: 'device'}),
							(network, device) => {
								resolve({network, device});
							}
						);
				})
				.catch(err => {
					reject(err);
				});
		});
	});

	config.bus.queryHandler({role: 'identity', cmd: 'authenticate'}, payload => {
		return new Promise((resolve, reject) => {
			jwt
				.verifyAsync(payload.token, config.options.jwtSecret)
				.then(token => {
					const id = `${token.network}:${token.device}:${token.user}`;
					return config.bus.query({role: 'store', cmd: 'get', type: 'linked-device'}, {id: id, type: 'linked-device'});
				})
				.then(linkedDevice => {
					resolve(linkedDevice);
				})
				.catch(err => {
					reject(err);
				});
		});
	});

	config.bus.queryHandler({role: 'identity', cmd: 'user'}, payload => {
		return new Promise(resolve => {
			// Get the user from the whatever user management system, local or 3rd party depending on service config
			resolve(true);
		});
	});

	config.bus.queryHandler({role: 'identity', cmd: 'config'}, payload => {
		return new Promise((resolve, reject) => {
			Promise
				.join(
					config.bus.query({role: 'store', cmd: 'get', type: 'network'}, {id: payload.network, type: 'network'}),
					config.bus.query({role: 'store', cmd: 'get', type: 'device'}, {id: payload.device, type: 'device'}),
					(network, device) => {
						const config = composeConfig({network, device});
						resolve(config);
					}
				)
				.catch(err => {
					reject(err);
				});
		});
	});

	return Promise.resolve(true);
};

service.middleware = {
	verifyAccess(options) {
		return (req, res, next) => {
			const token = req.get(options.header);
			if (token) {
				config.bus.query({role: 'identity', cmd: 'verify'}, {token})
					.then(identity => {
						req.identity = identity;
						next();
					})
					.catch(err => {
						next(boom.unauthorized('Invalid Access Token'));
					});
			} else {
				next(boom.unauthorized('Invalid Access Token'));
			}
		};
	},

	authenticateUser(options) {
		return (req, res, next) => {
			const token = req.get(options.header);
			if (token) {
				config.bus.query({role: 'identity', cmd: 'authenticate'}, {token})
					.then(identity => {
						req.identity = identity;
						next();
					})
					.catch(err => {
						next(boom.unauthorized('Invalid Authentication Token'));
					});
			} else {
				next(boom.unauthorized('Invalid Authentication Token'));
			}
		};
	}
};

service.router = (options) => {
	router.get(`/config`, (req, res, next) => {
		config.bus.query({role: 'identity', cmd: 'config'}, {network: req.identity.network.id, device: req.identity.device.id})
			.then(config => {
				res.body = {
					id: `${req.identity.network.id}:${req.identity.device.id}`,
					type: 'config',
					features: config.features,
					views: config.views
				};

				next();
			})
			.catch(err => {
				next(boom.wrap(err));
			});
	});

	return router;
};

function composeConfig(identity) {
	const networkFeatures = _.keys(identity.network.features);
	const deviceFeatures = _.keys(identity.device.features);
	const features = _.union(networkFeatures, deviceFeatures);

	const confg = {
		features: {},
		views: identity.device.views
	};

	_.each(features, key => {
		const networkKey = identity.network.features[key];
		const deviceKey = identity.device.features[key];
		const mergedKey = _.merge({}, networkKey, deviceKey);

		confg.features[key] = mergedKey;
	});

	return confg;
}

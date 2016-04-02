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

	bus.queryHandler({role: 'identity', cmd: 'verify'}, payload => {
		return new Promise((resolve) => {
			jwt.verifyAsync(payload.token, config.options.jwtSecret)
				.then(token => {
					return Promise.join(
							bus.query({role: 'store', cmd: 'get', type: 'organization'}, {id: token.organization, type: 'organization'}),
							bus.query({role: 'store', cmd: 'get', type: 'device'}, {id: token.device, type: 'device'}),
							(organization, device) => {
								return resolve({organization, device});
							}
						);
				});
		});
	});

	bus.queryHandler({role: 'identity', cmd: 'config'}, payload => {
		return new Promise((resolve) => {
			return Promise.join(
					bus.query({role: 'store', cmd: 'get', type: 'organization'}, {id: payload.organization, type: 'organization'}),
					bus.query({role: 'store', cmd: 'get', type: 'device'}, {id: payload.device, type: 'device'}),
					(organization, device) => {
						const config = composeConfig({organization, device});
						return resolve(config);
					}
				);
		});
	});

	return Promise.resolve(true);
};

service.middleware = (bus, options) => {
	return (req, res, next) => {
		const token = req.get(options.header);
		if (token) {
			bus.query({role: 'identity', cmd: 'verify'}, {token})
				.then(identity => {
					req.identity = identity;
					next();
				})
				.catch(err => {
					next(boom.unauthorized(err.message));
				});
		} else {
			next(boom.unauthorized('Invalid Token'));
		}
	};
};

service.router = (bus, options) => {
	router.get(`/config`, (req, res, next) => {
		bus.query({role: 'identity', cmd: 'config'}, {organization: req.identity.organization.id, device: req.identity.device.id})
			.then(config => {
				res.body = {
					id: `${req.identity.organization.id}:${req.identity.device.id}`,
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
	const organizationFeatures = _.keys(identity.organization.features);
	const deviceFeatures = _.keys(identity.device.features);
	const features = _.union(organizationFeatures, deviceFeatures);

	const confg = {
		features: {},
		views: identity.device.views
	};

	_.each(features, key => {
		const organizationKey = identity.organization.features[key];
		const deviceKey = identity.device.features[key];
		const mergedKey = _.merge({}, organizationKey, deviceKey);

		confg.features[key] = mergedKey;
	});

	return confg;
}

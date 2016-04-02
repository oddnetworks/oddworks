'use strict';

const Promise = require('bluebird');
const boom = require('boom');
const jwt = require('jsonwebtoken');
Promise.promisifyAll(jwt);

const service = exports = module.exports = {};

service.initialize = (bus, options) => {
	const self = this;
	this.bus = bus;
	this.options = options || {};

	bus.queryHandler({role: 'identity', cmd: 'verify'}, payload => {
		return new Promise((resolve) => {
			jwt.verifyAsync(payload.token, self.options.jwtSecret)
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

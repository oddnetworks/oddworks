'use strict';

const _ = require('lodash');
const debug = require('debug')('oddworks:middleware:authenticate');
const Boom = require('boom');

// options.bus - Oddcast Bus instance *required*
// options.header - HTTP header to look for the JWT *default=Authorization*
module.exports = function (options) {
	options = _.defaults({}, options, {
		header: 'Authorization'
	});

	if (!options.bus || !_.isObject(options.bus)) {
		throw new Error('The options.bus Object is required.');
	}

	const bus = options.bus;
	const header = options.header;

	return function authenticateMiddleware(req, res, next) {
		// Parse out the Authorization header if used.
		// ex: "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh..."
		debug('using the %s header', header);
		const headerValue = (req.get(header) || '').split(/[\s]+/);
		const token = headerValue.length > 1 ? headerValue[1] : headerValue[0];

		if (token) {
			debug('using token %s', token);
			bus
				.query({role: 'identity', cmd: 'verify'}, {token})
				.then(identity => {
					var okChannel = !identity.channel || identity.channel.active;
					if(!okChannel){
						debug('invalid-access: channel is not active');
						bus.broadcast(
							{level: 'warn', event: 'invalid-channel'},
							{message: 'channel is active: false', error: null}
						);
						next(Boom.unauthorized('Channel is not active'));
						return null;
					}					
					
					var okPlatform = !identity.platform || identity.platform.active;				
					if (!okPlatform) {
						debug('invalid-access: platform is not active');
						bus.broadcast(
							{level: 'warn', event: 'invalid-platform'},
							{message: 'platform is active: false', error: null}
						);
						next(Boom.unauthorized('Platform is not active'));
						return null;
					}

					req.identity = identity;
					next();
					return null;
				})
				.catch(err => {
					debug('invalid-access-token: %s', err.message);
					bus.broadcast(
						{level: 'warn', event: 'invalid-access-token'},
						{message: err.message, error: err}
					);
					next(Boom.unauthorized('Invalid Access Token'));
					return null;
				});
		} else {
			debug('missing-access-token');
			bus.broadcast(
				{level: 'info', event: 'missing-access-token'},
				{message: 'Missing Access Token'}
			);
			next(Boom.unauthorized('Missing Access Token'));
		}
	};
};

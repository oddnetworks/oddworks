'use strict';

const _ = require('lodash');
const express = require('express');
const Boom = require('boom');
const debug = require('debug');
const initializeQueries = require('./queries/');
const IdentityItemController = require('./controllers/identity-item-controller');
const IdentityListController = require('./controllers/identity-list-controller');
const IdentityConfigController = require('./controllers/identity-config-controller');

module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = _.defaults({}, options, {
		jwtIssuer: 'urn:oddworks'
	});

	const service = {
		name: 'identity',
		bus,
		options: options || Object.create(null),
		IdentityListController,
		IdentityItemController,
		IdentityConfigController
	};

	const queries = initializeQueries(service);

	// args.token - String *required*
	bus.queryHandler(
		{role: 'identity', cmd: 'verify'},
		queries.verify
	);

	// args.audience - Array of Strings *required*
	// args.subject - String *required if admin*
	// args.channel - String *required if non admin*
	// args.platform - String *required if non admin*
	// args.user - String
	bus.queryHandler(
		{role: 'identity', cmd: 'sign'},
		queries.sign
	);

	// args.channel - Object
	// args.platform - Object
	// args.user - Object
	bus.queryHandler(
		{role: 'identity', cmd: 'config'},
		queries.composeConfig
	);

	service.middleware = {
		// options.header - String default=Authorization
		authenticate(options) {
			const log = debug('oddworks:middleware:authenticate');
			options = _.defaults({}, options, {
				header: 'Authorization'
			});

			const header = options.header;
			log('using the %s header', header);

			return function authenticateMiddleware(req, res, next) {
				// Parse out the Authorization header if used.
				// ex: "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh..."
				const headerValue = (req.get(header) || '').split(/[\s]+/);
				const token = headerValue.length > 1 ? headerValue[1] : headerValue[0];

				if (token) {
					log('using token %s', token);
					bus
						.query({role: 'identity', cmd: 'verify'}, {token})
						.then(identity => {
							req.identity = identity;
							next();
							return null;
						})
						.catch(err => {
							log('invalid-access-token: %s', err.message);
							bus.broadcast(
								{level: 'warn', event: 'invalid-access-token'},
								{message: err.message, error: err}
							);
							next(Boom.unauthorized('Invalid Access Token'));
							return null;
						});
				} else {
					log('missing-access-token');
					bus.broadcast(
						{level: 'info', event: 'missing-access-token'},
						{message: 'Missing Access Token'}
					);
					next(Boom.unauthorized('Missing Access Token'));
				}
			};
		},

		// options.audience - Object
		authorize(options) {
			const log = debug('oddworks:middleware:authorize');
			options = _.defaults({}, options, {
				audience: Object.create(null)
			});

			const whiteList = options.audience;

			return function authorizeMiddleware(req, res, next) {
				let audience = (req.identity || {}).audience;
				if (!audience) {
					log('invalid-access-token: Missing token audience claim.');
					bus.broadcast(
						{level: 'warn', event: 'invalid-access-token'},
						{message: 'Missing token audience claim'}
					);
					next(Boom.unauthorized('Missing Token audience claim'));
				}

				audience = Array.isArray(audience) ? audience : [audience];

				const method = req.method.toLowerCase();
				const allowed = whiteList[method];
				log('method: %s', method);
				log('audience: %s', audience.join());
				log('allowed: %s', allowed.join());
				if (!allowed) {
					return next(Boom.methodNotAllowed());
				}

				let i;
				for (i = 0; i < allowed.length; i += 1) {
					if (audience.indexOf(allowed[i]) >= 0) {
						return next();
					}
				}

				next(Boom.forbidden(
					`${req.method} access not permitted to this resource`
				));
			};
		}
	};

	bus.queryHandler(
		{middleware: 'authenticate'},
		service.middleware.authenticate
	);

	bus.queryHandler(
		{middleware: 'authorize'},
		service.middleware.authorize
	);

	service.router = function (options) {
		options = _.defaults({}, options, {
			types: ['channel', 'platform']
		});

		const types = options.types;
		const router = options.router || express.Router(); // eslint-disable-line

		types.forEach(type => {
			router.all(
				`/${type}s`,
				service.middleware.authorize({audience: {
					get: ['admin'],
					post: ['admin']
				}}),
				IdentityListController.create({bus, type})
			);

			router.all(
				`/${type}s/:id`,
				service.middleware.authorize({audience: {
					get: ['admin'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				IdentityItemController.create({bus, type})
			);
		});

		router.all(
			'/config',
			service.middleware.authorize({audience: {
				get: ['platform', 'admin']
			}}),
			IdentityConfigController.create({bus})
		);

		return router;
	};

	return Promise.resolve(service);
};

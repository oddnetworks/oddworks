'use strict';

const _ = require('lodash');
const express = require('express');
const Boom = require('boom');

const queries = require('./queries/');
const IdentityItemController = require('./controllers/identity-item-controller');
const IdentityListController = require('./controllers/identity-list-controller');
const IdentityConfigController = require('./controllers/identity-config-controller');

exports.initialize = (bus, options) => {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	const service = {
		name: 'identity',
		bus,
		options: options || Object.create(null),
		queries
	};

	bus.queryHandler(
		{role: 'identity', cmd: 'verify'},
		queries.verify(service)
	);

	bus.queryHandler(
		{role: 'identity', cmd: 'authenticate'},
		queries.authenticate(service)
	);

	bus.queryHandler({role: 'identity', cmd: 'user'}, () => {
		return Promise.reject(new Error('role:identity,cmd:user is not implemented'));
	});

	bus.queryHandler(
		{role: 'identity', cmd: 'config'},
		queries.fetchConfig(service)
	);

	service.middleware = {
		authenticate(options) {
			options = _.defaults({}, options, {
				header: 'x-access-token'
			});

			const header = options.header;

			return function authenticateMiddleware(req, res, next) {
				// Parse out the Authorization header if used.
				// ex: "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh..."
				const headerValue = (req.get(header) || '').split(/[\s]+/);
				const token = headerValue.length > 1 ? headerValue[1] : headerValue[0];

				if (token) {
					service.bus
						.query({role: 'identity', cmd: 'verify'}, {token})
						.then(identity => {
							req.identity = identity;
							next();
						})
						.catch(() => next(Boom.unauthorized('Invalid Access Token')));
				} else {
					next(Boom.unauthorized('Missing Access Token'));
				}
			};
		},

		authenticateUser(options) {
			options = _.defaults({}, options, {
				header: 'authorization'
			});

			const header = options.header;

			return function authenticateUser(req, res, next) {
				// Consider the "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh..."
				const headerValue = req.get(header).split(' ');
				const token = headerValue[1] || headerValue[0];

				if (token) {
					service.bus
						.query({role: 'identity', cmd: 'authenticate'}, {token})
						.then(user => {
							req.user = user;
							next();
						})
						.catch(() => next(Boom.unauthorized('Invalid Authentication Token')));
				} else {
					next(Boom.unauthorized('Missing Authentication Token'));
				}
			};
		}
	};

	service.router = options => {
		options = _.defaults({}, options, {
			types: ['channel', 'platform']
		});

		const types = options.types;
		const router = options.router || express.Router(); // eslint-disable-line

		types.forEach(type => {
			router.all(`/${type}s`, IdentityListController.create({
				bus: service.bus,
				type
			}));

			router.all(`/${type}s/:id`, IdentityItemController.create({
				bus: service.bus,
				type
			}));
		});

		router.all('/config', IdentityConfigController.create({
			bus: service.bus
		}));

		return router;
	};

	return Promise.resolve(service);
};

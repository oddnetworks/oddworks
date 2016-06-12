'use strict';

const express = require('express');
const boom = require('boom');

const queries = require('./queries/');
const IdentityItemController = require('./controllers/identity-item-controller');
const IdentityListController = require('./controllers/identity-list-controller');
const IdentityConfigController = require('./controllers/identity-config-controller');

const service = exports;

service.name = 'identity';

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options || Object.creat(null);

	service.bus.queryHandler(
		{role: 'identity', cmd: 'verify'},
		queries.verify(service)
	);

	service.bus.queryHandler(
		{role: 'identity', cmd: 'authenticate'},
		queries.authenticate(service)
	);

	service.bus.queryHandler({role: 'identity', cmd: 'user'}, () => {
		return Promise.reject(new Error('role:identity,cmd:user is not implemented'));
	});

	service.bus.queryHandler(
		{role: 'identity', cmd: 'config'},
		queries.fetchConfig(service)
	);

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
		options = options || {};
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

service.router = options => {
	options = options || {};
	const types = options.types || ['channel', 'platform'];

	const router = express.Router(); // eslint-disable-line

	types.forEach(type => {
		router.all(`/${type}s`, IdentityListController.create({
			bus: service.bus,
			type: type
		}));

		router.all(`/${type}s/:id`, IdentityItemController.create({
			bus: service.bus,
			type: type
		}));
	});

	router.all('/config', IdentityConfigController.create({
		bus: service.bus
	}));

	return router;
};

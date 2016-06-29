'use strict';

const _ = require('lodash');
const express = require('express');
const debug = require('debug')('oddworks:identity-service');
const middleware = require('../../middleware');
const initializeQueries = require('./queries/');
const IdentityItemController = require('./controllers/identity-item-controller');
const IdentityListController = require('./controllers/identity-list-controller');
const IdentityConfigController = require('./controllers/identity-config-controller');

module.exports = function (bus, options) {
	debug('initializing');
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

	service.router = function (options) {
		debug('setting up routes');
		options = _.defaults({}, options, {
			types: ['channel', 'platform']
		});

		const types = options.types;
		const router = options.router || express.Router(); // eslint-disable-line

		types.forEach(type => {
			router.all(
				`/${type}s`,
				middleware['request-authorize']({audience: {
					get: ['admin'],
					post: ['admin']
				}}),
				IdentityListController.create({bus, type})
			);

			router.all(
				`/${type}s/:id`,
				middleware['request-authorize']({audience: {
					get: ['admin'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				IdentityItemController.create({bus, type})
			);
		});

		router.all(
			'/config',
			middleware['request-authorize']({audience: {
				get: ['platform', 'admin']
			}}),
			IdentityConfigController.create({bus})
		);

		return router;
	};

	debug('initialized');
	return Promise.resolve(service);
};

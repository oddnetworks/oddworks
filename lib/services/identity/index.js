'use strict';

const _ = require('lodash');
const express = require('express');
const debug = require('debug')('oddworks:identity-service');
const middleware = require('../../middleware');
const initializeQueries = require('./queries/');
const IdentityItemController = require('./controllers/identity-item-controller');
const IdentityListController = require('./controllers/identity-list-controller');
const IdentityConfigController = require('./controllers/identity-config-controller');
const ViewerRelationshipController = require('./controllers/viewer-relationship-controller');
const IdentityLoginController = require('./controllers/identity-login-controller');

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
		IdentityConfigController,
		IdentityLoginController
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
	// args.viewer - String
	bus.queryHandler(
		{role: 'identity', cmd: 'sign'},
		queries.sign
	);

	// args.channel - Object
	// args.platform - Object
	// args.viewer - Object
	bus.queryHandler(
		{role: 'identity', cmd: 'config'},
		queries.composeConfig
	);

	service.router = function (options) {
		debug('setting up routes');
		options = _.defaults({}, options, {
			types: ['channel', 'platform', 'viewer']
		});

		const types = options.types;
		const router = options.router || express.Router(); // eslint-disable-line babel/new-cap, new-cap

		types.forEach(type => {
			router.all(
				`/${type}s`,
				middleware['request-authorize']({bus, audience: {
					get: ['admin'],
					post: ['admin']
				}}),
				IdentityListController.create({bus, type})
			);

			router.all(
				`/${type}s/:id`,
				middleware['request-authorize']({bus, audience: {
					get: ['admin', 'platform'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				IdentityItemController.create({bus, type})
			);
		});

		// Being: Viewer Relationships
		['watchlist'].forEach(relationship => {
			router.all(
				`/viewers/:id/relationships/${relationship}`,
				middleware['request-authorize']({bus, audience: {
					get: ['admin', 'platform'],
					post: ['admin', 'platform'],
					delete: ['admin', 'platform']
				}}),
				ViewerRelationshipController.create({bus, relationship})
			);
		});
		// End: Viewer Relationships

		router.all(
			'/login',
			middleware['request-authorize']({bus, audience: {
				post: ['platform']
			}}),
			IdentityLoginController.create({bus})
		);

		router.all(
			'/config',
			middleware['request-authorize']({bus, audience: {
				get: ['platform', 'admin']
			}}),
			IdentityConfigController.create({bus})
		);

		return router;
	};

	debug('initialized');
	return Promise.resolve(service);
};

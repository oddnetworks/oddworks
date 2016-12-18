'use strict';

const _ = require('lodash');
const express = require('express');
const debug = require('debug')('oddworks:identity-service');
const middleware = require('../../middleware');
const initializeQueries = require('./queries/');
const IdentityChannelController = require('./controllers/identity-channel-controller');
const IdentityChannelsListController = require('./controllers/identity-channels-list-controller');
const IdentityViewerController = require('./controllers/identity-viewer-controller');
const IdentityViewersListController = require('./controllers/identity-viewers-list-controller');
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
		IdentityLoginController,
		ViewerRelationshipController,
		IdentityChannelsListController,
		IdentityChannelController
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

		const types = _.without(options.types, 'channel', 'viewer');
		const router = options.router || express.Router(); // eslint-disable-line babel/new-cap, new-cap

		// Hook up the channels route
		//

		router.all(
			'/channels',
			middleware['request-authorize']({bus, audience: {
				get: ['admin'],
				post: ['admin']
			}}),
			IdentityChannelsListController.create({bus})
		);

		router.all(
			'/channels/:id',
			middleware['request-authorize']({bus, audience: {
				get: ['admin'],
				patch: ['admin'],
				delete: ['admin']
			}}),
			IdentityChannelController.create({bus})
		);

		// Hook up the viewers route
		//

		router.all(
			'/viewers',
			middleware['request-authorize']({bus, audience: {
				get: ['admin'],
				post: ['admin']
			}}),
			IdentityViewersListController.create({bus})
		);

		router.all(
			'/viewers/:id',
			middleware['request-authorize']({bus, audience: {
				get: ['admin', 'platform'],
				patch: ['admin'],
				delete: ['admin']
			}}),
			IdentityViewerController.create({bus})
		);

		// Hook up all other types
		//

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
					get: ['admin'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				IdentityItemController.create({bus, type})
			);
		});

		// Hook up Viewer Relationships
		//

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

		// Hook up Login
		//

		router.all(
			'/login',
			middleware['request-authorize']({bus, audience: {
				post: ['platform']
			}}),
			IdentityLoginController.create({bus})
		);

		// Hook up Config
		//

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

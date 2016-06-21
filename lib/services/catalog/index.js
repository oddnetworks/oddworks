'use strict';

const _ = require('lodash');
const express = require('express');

const initializeQueries = require('./queries/');
const initializeCommands = require('./commands/');
const CatalogItemController = require('./controllers/catalog-item-controller');
const CatalogListController = require('./controllers/catalog-list-controller');
const CatalogItemSpecController = require('./controllers/catalog-item-spec-controller');
const CatalogItemSpecListController = require('./controllers/catalog-item-spec-list-controller');
const CatalogSearchController = require('./controllers/catalog-search-controller');

module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	const service = {
		name: 'catalog',
		bus,
		options: options || Object.create(null),
		middleware: exports.middleware,
		router: exports.router
	};

	const identityService = service.options.identityService;
	if (!identityService || !_.isObject(identityService)) {
		throw new Error(
			'options.identityService is required to initialize the catalog service.'
		);
	}

	const queries = initializeQueries(service);
	const commands = initializeCommands(service);

	service.bus.queryHandler(
		{role: 'catalog', cmd: 'fetchItem'},
		queries.fetchItem
	);

	service.bus.queryHandler(
		{role: 'catalog', cmd: 'fetchItemList'},
		queries.fetchItemList
	);

	service.bus.queryHandler(
		{role: 'catalog', cmd: 'fetchItemSpec'},
		queries.fetchItemSpec
	);

	service.bus.queryHandler(
		{role: 'catalog', cmd: 'fetchItemSpecList'},
		queries.fetchItemSpecList
	);

	service.bus.commandHandler(
		{role: 'catalog', cmd: 'setItem'},
		commands.setItem
	);

	service.bus.commandHandler(
		{role: 'catalog', cmd: 'removeItem'},
		commands.removeItem
	);

	service.bus.commandHandler(
		{role: 'catalog', cmd: 'setItemSpec'},
		commands.setItemSpec
	);

	service.bus.commandHandler(
		{role: 'catalog', cmd: 'removeItemSpec'},
		commands.removeItemSpec
	);

	service.bus.queryHandler({role: 'catalog', cmd: 'search'}, payload => {
		bus
			.query({role: 'store', cmd: 'query'}, payload)
			.then(_.flatten);
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'create', searchable: true}, payload => {
		return Promise
			.all([
				service.bus.sendCommand({role: 'catalog', cmd: 'create'}, payload),
				service.bus.sendCommand({role: 'catalog', cmd: 'index'}, payload)
			])
			.then(_.constant(true));
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'index'}, payload => {
		return service.bus
			.query({role: 'catalog', cmd: 'fetchItem'}, payload)
			.then(object => {
				const pattern = {role: 'store', cmd: 'index', type: payload.type};
				return service.bus.sendCommand(pattern, {
					id: object.id,
					text: `${object.title} ${object.description}`
				});
			})
			.then(_.constant(true));
	});

	exports.router = function (options) {
		options = _.defaults({}, options, {
			types: ['collection', 'promotion', 'video', 'view'],
			specTypes: []
			// example: 'collectionSpec', 'videoSpec', 'viewSpec'
		});

		const types = options.types;
		const specTypes = options.specTypes;
		const router = options.router || express.Router(); // eslint-disable-line

		types.forEach(type => {
			router.all(
				`/${type}s`,
				identityService.middleware.authorize({bus, audience: {
					get: ['admin', 'platform'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				CatalogListController.create({bus, type})
			);

			router.all(
				`/${type}s/:id`,
				identityService.middleware.authorize({bus, audience: {
					get: ['admin', 'platform'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				CatalogItemController.create({bus, type})
			);
		});

		router.all('/search', CatalogSearchController.create({bus}));

		specTypes.forEach(type => {
			router.all(
				`/${type}s`,
				identityService.middleware.authorize({bus, audience: {
					get: ['admin'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				CatalogItemSpecController.create({bus, type})
			);

			router.all(
				`/${type}s/:id`,
				identityService.middleware.authorize({bus, audience: {
					get: ['admin'],
					patch: ['admin'],
					delete: ['admin']
				}}),
				CatalogItemSpecListController.create({bus, type})
			);
		});

		return router;
	};

	return Promise.resolve(service);
};

'use strict';

const _ = require('lodash');
const express = require('express');

const queries = require('./queries/');
const CatalogItemController = require('./controllers/catalog-item-controller');
const CatalogListController = require('./controllers/catalog-list-controller');
const CatalogSearchController = require('./controllers/catalog-search-controller');

const service = exports;

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options || Object.create(null);

	service.bus.queryHandler(
		{role: 'catalog', cmd: 'fetchItem'},
		queries.fetchItem(service)
	);

	service.bus.queryHandler(
		{role: 'catalog', cmd: 'fetchList'},
		queries.fetchList(service)
	);

	service.bus.queryHandler({role: 'catalog', cmd: 'search'}, payload => {
		return new Promise((resolve, reject) => {
			service.bus
				.query({role: 'store', cmd: 'query'}, payload)
				.then(objects => resolve(_.flatten(objects)))
				.catch(err => reject(err));
		});
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'create', searchable: true}, payload => {
		return Promise
			.all([
				service.bus.sendCommand({role: 'catalog', cmd: 'create'}, payload),
				service.bus.sendCommand({role: 'catalog', cmd: 'index'}, payload)
			])
			.then(_.constant(true));
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'create'}, payload => {
		return service.bus
			.sendCommand({role: 'store', cmd: 'set', type: payload.type}, payload)
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

	return Promise.resolve(true);
};

service.router = options => {
	options = options || {};
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	const router = express.Router(); // eslint-disable-line

	types.forEach(type => {
		router.all(`/${type}s`, CatalogListController.create({
			bus: service.bus,
			type
		}));

		router.all(`/${type}s/:id`, CatalogItemController.create({
			bus: service.bus,
			type
		}));
	});

	router.all('/search', CatalogSearchController.create({
		bus: service.bus
	}));

	return router;
};

service.name = 'catalog';

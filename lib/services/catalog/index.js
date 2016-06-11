'use strict';

const _ = require('lodash');

const queries = require('./queries/');
const CatalogItemController = require('./controllers/catalog-item-controller');
const CatalogListController = require('./controllers/catalog-list-controller');
const CatalogSearchController = require('./controllers/catalog-search-controller');

const CONFIG = Object.create(null);

const service = exports;

service.initialize = (bus, options) => {
	service.bus = bus;
	CONFIG.options = options;

	service.bus.queryHandler({role: 'catalog', cmd: 'fetchItem'}, queries.fetchItem);
	service.bus.queryHandler({role: 'catalog', cmd: 'fetchList'}, queries.fetchList);

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
			.join([
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
			.query({role: 'catalog', cmd: 'fetch'}, payload)
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

service.router = (app, options) => {
	options = options || {};
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	types.forEach(type => {
		app.all(`/${type}s`, CatalogListController.create({
			bus: service.bus,
			type: type
		}));

		app.all(`/${type}s/:id`, CatalogItemController.create({
			bus: service.bus,
			type: type
		}));
	});

	app.all('/search', CatalogSearchController.create({
		bus: service.bus
	}));

	return app;
};

service.name = 'catalog';

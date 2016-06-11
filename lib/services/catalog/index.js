'use strict';

const _ = require('lodash');
const router = require('express').Router(); // eslint-disable-line

const queries = require('./queries/');

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

service.router = options => {
	options = options || {};
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	types.forEach(type => {
		router.get(`/${type}s`, (req, res, next) => {
			service.bus
				.query({role: 'catalog', cmd: 'fetchList'}, {type, channel: req.identity.channel.id, platform: req.identity.platform.id})
				.then(objects => {
					res.body = objects;
					next();
				});
		});

		router.get(`/${type}s/:id`, (req, res, next) => {
			service.bus
				.query({role: 'catalog', cmd: 'fetchItem'}, {type, id: req.params.id, channel: req.identity.channel.id, platform: req.identity.platform.id})
				.then(object => {
					res.body = object;
					next();
				});
		});
	});

	router.get('/search', (req, res, next) => {
		service.bus
			.query({role: 'catalog', cmd: 'search'}, {query: req.query.q})
			.then(objects => {
				res.body = objects;
				next();
			});
	});

	return router;
};

service.name = 'catalog';

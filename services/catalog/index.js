'use strict';

const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line

const service = exports = module.exports = {};
let config = {};

service.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	bus.queryHandler({role: 'catalog', cmd: 'fetch'}, payload => {
		if (payload.id) {
			return bus.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type, id: payload.id});
		}

		return bus.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type});
	});

	return Promise.resolve(true);
};

service.router = (bus, options) => {
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	types.forEach(type => {
		router.get(`/${type}s`, (req, res, next) => {
			bus.query({role: 'catalog', cmd: 'fetch'}, {type})
				.then(objects => {
					res.body = objects;
					next();
				});
		});

		router.get(`/${type}s/:id`, (req, res, next) => {
			bus.query({role: 'catalog', cmd: 'fetch'}, {type, id: req.params.id})
				.then(object => {
					res.body = object;
					next();
				});
		});
	});

	return router;
};

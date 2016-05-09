'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line
const boom = require('boom');

const respond = require('../../respond');

const service = exports = module.exports = {};

service.name = 'storage';

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options || {};

	return Promise.resolve(true);
};

service.middleware = {};

service.router = options => { // eslint-disable-line
	router.get('/content/:id', (req, res, next) => {
		service.bus
			.query({role: 'store', cmd: 'get', type: 'content'}, {id: req.params.id, type: 'content'})
			.then(resource => {
				if (!resource) {
					return next(boom.notFound());
				}

				respond.ok(res, resource);
				next();
			});
	});

	router.post('/content', (req, res, next) => {
		const payload = req.body;
		payload.type = 'content';

		service.bus.sendCommand({role: 'store', cmd: 'set', type: 'content'}, payload);

		respond.accepted(res);
		next();
	});

	router.put('/content/:id', (req, res, next) => {
		const payload = req.body;
		payload.type = 'content';

		service.bus.sendCommand({role: 'store', cmd: 'set', type: 'content'}, payload);

		respond.accepted(res);
		next();
	});

	router.patch('/content/:id', (req, res, next) => {
		const payload = req.body;
		payload.type = 'content';

		service.bus
			.query({role: 'store', cmd: 'get', type: 'content'}, payload)
			.then(resource => {
				resource = _.assign(resource, payload);
				service.bus.sendCommand({role: 'store', cmd: 'set', type: 'content'}, resource);

				respond.accepted(res);
				next();
			});
	});

	router.delete('/content/:id', (req, res, next) => {
		const payload = req.body;
		service.bus.query({role: 'store', cmd: 'delete', type: 'content'}, payload);

		respond.accepted(res);
		next();
	});

	return router;
};

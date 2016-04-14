'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line

const analyzers = require('./analyzers');

const service = exports = module.exports = {};
let config = {};

service.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options || {};

	config.options.analyzers = _.compact(config.options.analyzers);

	config.bus.observe({role: 'events'}, payload => {
		_.each(config.options.analyzers, analyzer => {
			analyzer.send(payload);
		});
	});

	return Promise.resolve(true);
};

service.router = options => {
	router.post(`/events`, (req, res, next) => {
		config.bus.broadcast({role: 'events'}, req.body);

		res.status(201);
		res.body = {
			message: 'Event Logged' || options.message
		};
		next();
	});

	return router;
};

service.analyzers = analyzers;

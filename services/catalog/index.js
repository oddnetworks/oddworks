'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line

const service = exports = module.exports = {};
let config = {};
const videoKeys = ['ads', 'player', 'sharing', 'overlay'];

service.initialize = (bus, options) => {
	config.bus = bus;
	config.options = options;

	config.bus.queryHandler({role: 'catalog', cmd: 'fetch'}, payload => {
		return new Promise((resolve) => {
			if (payload.id) {
				config.bus.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type, id: payload.id})
					.then(object => {
						if (payload.type === 'video' && payload.network && payload.device) {
							config.bus.query({role: 'identity', cmd: 'config'}, {network: payload.network, device: payload.device})
								.then(config => {
									object = _.merge({}, _.pick(config.features, videoKeys), object);
									resolve(object);
								});
						}

						resolve(object);
					});
			}

			config.bus.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type})
				.then(objects => {
					if (payload.type === 'video' && payload.network && payload.device) {
						config.bus.query({role: 'identity', cmd: 'config'}, {network: payload.network, device: payload.device})
							.then(config => {
								objects = _.map(objects, object => {
									return _.merge({}, _.pick(config.features, videoKeys), object);
								});

								resolve(objects);
							});
					}

					resolve(objects);
				});
		});
	});

	return Promise.resolve(true);
};

service.router = (options) => {
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	types.forEach(type => {
		router.get(`/${type}s`, (req, res, next) => {
			config.bus.query({role: 'catalog', cmd: 'fetch'}, {type, network: req.identity.network.id, device: req.identity.device.id})
				.then(objects => {
					res.body = objects;
					next();
				});
		});

		router.get(`/${type}s/:id`, (req, res, next) => {
			config.bus.query({role: 'catalog', cmd: 'fetch'}, {type, id: req.params.id, network: req.identity.network.id, device: req.identity.device.id})
				.then(object => {
					res.body = object;
					next();
				});
		});
	});

	return router;
};

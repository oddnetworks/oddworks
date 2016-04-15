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
		return new Promise((resolve, reject) => {
			if (payload.id) {
				config.bus
					.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type, id: payload.id})
					.then(object => {
						if (payload.type === 'video' && payload.network && payload.device) {
							config.bus
								.query({role: 'identity', cmd: 'config'}, {network: payload.network, device: payload.device})
								.then(config => {
									object = _.merge({}, object, _.pick(config.features, videoKeys));
									resolve(object);
								})
								.catch(err => reject(err));
						} else {
							resolve(object);
						}
					})
					.catch(err => reject(err));
			}

			config.bus.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type})
				.then(objects => {
					if (payload.type === 'video' && payload.network && payload.device) {
						config.bus
							.query({role: 'identity', cmd: 'config'}, {network: payload.network, device: payload.device})
							.then(config => {
								objects = _.map(objects, object => {
									return _.merge({}, _.pick(config.features, videoKeys), object);
								});

								resolve(objects);
							})
							.catch(err => reject(err));
					} else {
						resolve(objects);
					}
				});
		});
	});

	config.bus.queryHandler({role: 'catalog', cmd: 'search'}, payload => {
		return new Promise((resolve, reject) => {
			config.bus
				.query({role: 'store', cmd: 'query'}, payload)
				.then(objects => resolve(_.flatten(objects)))
				.catch(err => reject(err));
		});
	});

	config.bus.commandHandler({role: 'catalog', cmd: 'create', searchable: true}, payload => {
		return new Promise((resolve, reject) => {
			Promise.join(
				config.bus.sendCommand({role: 'catalog', cmd: 'create'}, payload),
				config.bus.sendCommand({role: 'catalog', cmd: 'index'}, payload),
				() => {
					resolve(true);
				}
			)
			.catch(err => reject(err));
		});
	});

	config.bus.commandHandler({role: 'catalog', cmd: 'create'}, payload => {
		return new Promise((resolve, reject) => {
			config.bus.sendCommand({role: 'store', cmd: 'set', type: payload.type}, payload)
				.then(() => resolve(true))
				.catch(err => reject(err));
		});
	});

	config.bus.commandHandler({role: 'catalog', cmd: 'index'}, payload => {
		return new Promise((resolve, reject) => {
			config.bus.query({role: 'catalog', cmd: 'fetch'}, payload)
				.then(object => {
					return config.bus.sendCommand({role: 'store', cmd: 'index', type: payload.type}, {id: object.id, text: `${object.title} ${object.description}`});
				})
				.then(() => resolve(true))
				.catch(err => reject(err));
		});
	});

	return Promise.resolve(true);
};

service.router = options => {
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	types.forEach(type => {
		router.get(`/${type}s`, (req, res, next) => {
			config.bus
				.query({role: 'catalog', cmd: 'fetch'}, {type, network: req.identity.network.id, device: req.identity.device.id})
				.then(objects => {
					res.body = objects;
					next();
				});
		});

		router.get(`/${type}s/:id`, (req, res, next) => {
			config.bus
				.query({role: 'catalog', cmd: 'fetch'}, {type, id: req.params.id, network: req.identity.network.id, device: req.identity.device.id})
				.then(object => {
					res.body = object;
					next();
				});
		});
	});

	router.get('/search', (req, res, next) => {
		config.bus
			.query({role: 'catalog', cmd: 'search'}, {query: req.query.q})
			.then(objects => {
				res.body = objects;
				next();
			});
	});

	return router;
};

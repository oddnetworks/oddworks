'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router(); // eslint-disable-line

const lib = require('./lib');

const service = exports = module.exports = {};
let config = {};

service.initialize = (bus, options) => {
	service.bus = bus;
	config.options = options;

	service.bus.queryHandler({role: 'catalog', cmd: 'fetch'}, payload => {
		return new Promise((resolve, reject) => {
			if (payload.id) {
				service.bus
					.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type, id: payload.id})
					.then(object => {
						if (payload.type === 'video' && payload.channel && payload.platform) {
							service.bus
								.query({role: 'identity', cmd: 'config'}, {channel: payload.channel, platform: payload.platform})
								.then(config => {
									_.set(object, 'meta.features', lib.composeMetaFeatures(object, config.features));

									resolve(object);
								})
								.catch(err => reject(err));
						} else {
							resolve(object);
						}
					})
					.catch(err => reject(err));
			}

			service.bus.query({role: 'store', cmd: 'get', type: payload.type}, {type: payload.type})
				.then(objects => {
					if (payload.type === 'video' && payload.channel && payload.platform) {
						service.bus
							.query({role: 'identity', cmd: 'config'}, {channel: payload.channel, platform: payload.platform})
							.then(config => {
								objects = _.map(objects, object => {
									_.set(object, 'meta.features', lib.composeMetaFeatures(object, config.features));
									return object;
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

	service.bus.queryHandler({role: 'catalog', cmd: 'search'}, payload => {
		return new Promise((resolve, reject) => {
			service.bus
				.query({role: 'store', cmd: 'query'}, payload)
				.then(objects => resolve(_.flatten(objects)))
				.catch(err => reject(err));
		});
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'create', searchable: true}, payload => {
		return new Promise((resolve, reject) => {
			Promise.join(
				service.bus.sendCommand({role: 'catalog', cmd: 'create'}, payload),
				service.bus.sendCommand({role: 'catalog', cmd: 'index'}, payload),
				() => {
					resolve(true);
				}
			)
			.catch(err => reject(err));
		});
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'create'}, payload => {
		return new Promise((resolve, reject) => {
			service.bus.sendCommand({role: 'store', cmd: 'set', type: payload.type}, payload)
				.then(() => resolve(true))
				.catch(err => reject(err));
		});
	});

	service.bus.commandHandler({role: 'catalog', cmd: 'index'}, payload => {
		return new Promise((resolve, reject) => {
			service.bus.query({role: 'catalog', cmd: 'fetch'}, payload)
				.then(object => {
					return service.bus.sendCommand({role: 'store', cmd: 'index', type: payload.type}, {id: object.id, text: `${object.title} ${object.description}`});
				})
				.then(() => resolve(true))
				.catch(err => reject(err));
		});
	});

	return Promise.resolve(true);
};

service.router = options => {
	options = options || {};
	const types = options.types || ['collection', 'promotion', 'video', 'view'];

	types.forEach(type => {
		router.get(`/${type}s`, (req, res, next) => {
			service.bus
				.query({role: 'catalog', cmd: 'fetch'}, {type, channel: req.identity.channel.id, platform: req.identity.platform.id})
				.then(objects => {
					res.body = objects;
					next();
				});
		});

		router.get(`/${type}s/:id`, (req, res, next) => {
			service.bus
				.query({role: 'catalog', cmd: 'fetch'}, {type, id: req.params.id, channel: req.identity.channel.id, platform: req.identity.platform.id})
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

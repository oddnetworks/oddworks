const _ = require('lodash');
const Promise = require('bluebird');
const router = require('express').Router();

const service = exports = module.exports = {};

service.initialize = (bus, options) => {
	const self = this;
	this.bus = bus;
	this.options = options || {};

	bus.queryHandler({role: 'catalog', cmd: 'fetch'}, payload => {
		if (payload.id) {
			return self.options.redis.hgetAsync(payload.type, payload.id)
				.then(object => {
					return JSON.parse(object);
				});
		}

		return self.options.redis.hgetallAsync(payload.type)
			.then(objects => {
				objects = _.map(_.toArray(objects), object => {
					return JSON.parse(object);
				});
				return objects;
			});
	});

	return Promise.resolve(true);
};

service.router = (bus, options) => {
	['collection', 'promotion', 'video', 'view'].forEach(type => {
		router.get(`/${type}s`, (req, res) => {
			bus.query({role: 'catalog', cmd: 'fetch'}, {type: type})
				.then(object => {
					res.send(object);
				});
		});

		router.get(`/${type}s/:id`, (req, res) => {
			bus.query({role: 'catalog', cmd: 'fetch'}, {type: type, id: req.params.id})
				.then(object => {
					res.send(object);
				});
		});
	});

	return router;
};

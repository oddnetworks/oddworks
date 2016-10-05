'use strict';

const _ = require('lodash');

const Controller = require('../../../controllers/controller');

class CatalogSearchController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	get(req, res, next) {
		this.bus
			.query({role: 'catalog', cmd: 'search'}, {query: req.query.q, channel: req.identity.channel.id, type: req.query.type})
			.then(objects => {
				res.body = objects;
				next();
			});
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemController spec.bus is required');
		}

		return Controller.create(new CatalogSearchController(spec));
	}
}

module.exports = CatalogSearchController;

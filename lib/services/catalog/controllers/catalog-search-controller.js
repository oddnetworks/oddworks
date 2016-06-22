'use strict';

const _ = require('lodash');

const controller = require('../../../controllers/controller');

class CatalogSearchController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	get(req, res, next) {
		this.bus
			.query({role: 'catalog', cmd: 'search'}, {query: req.query.q})
			.then(objects => {
				res.body = objects;
				next();
			});
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemController spec.bus is required');
		}

		return controller.create(new CatalogSearchController(spec));
	}
}

module.exports = CatalogSearchController;

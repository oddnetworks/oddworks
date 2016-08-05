'use strict';

const _ = require('lodash');

const controller = require('../../../controllers/controller');

class CatalogSearchController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const theChannel = req.query.channel ? req.query.channel : req.identity.channel.id;

		this.bus
			.query({role: 'catalog', cmd: 'search'}, {query: req.query.q, channel: theChannel, type: req.query.type})
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

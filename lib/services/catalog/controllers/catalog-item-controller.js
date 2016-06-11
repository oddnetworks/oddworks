'use strict';

const _ = require('lodash');

const controller = require('../../../controller');

class CatalogItemController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const args = {
			type: this.type,
			id: req.params.id,
			channel: req.identity.channel.id,
			platform: req.identity.platform.id
		};

		this.bus
			.query({role: 'catalog', cmd: 'fetchItem'}, args)
			.then(object => {
				res.body = object;
				next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemController spec.type is required');
		}

		return controller.create(new CatalogItemController(spec));
	}
}

module.exports = CatalogItemController;

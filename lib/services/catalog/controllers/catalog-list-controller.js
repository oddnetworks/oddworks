'use strict';

const _ = require('lodash');

class CatalogListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const args = {
			type: this.type,
			channel: req.identity.channel.id,
			platform: req.identity.platform.id
		};

		this.bus
			.query({role: 'catalog', cmd: 'fetchList'}, args)
			.then(objects => {
				res.body = objects;
				next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogListController spec.type is required');
		}

		return new CatalogListController(spec);
	}
}

module.exports = CatalogListController;

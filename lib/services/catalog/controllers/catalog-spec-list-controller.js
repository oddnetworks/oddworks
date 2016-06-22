'use strict';

const _ = require('lodash');

const controller = require('../../../controller');

class CatalogItemSpecListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const args = {
			channel: req.identity.channel.id,
			type: this.type,
			limit: req.query.limit
		};

		this.bus
			.query({role: 'catalog', cmd: 'fetchItemList'}, args)
			.then(resources => {
				res.status(200);
				res.body = resources;
				next();
			})
			.catch(next);
	}

	post(req, res, next) {
		const payload = req.body;
		payload.channel = req.identity.channel.id;
		payload.type = this.type;

		this.bus
			.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, payload)
			.then(resource => {
				res.body = resource;
				res.status(201);
				next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemSpecListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemSpecListController spec.type is required');
		}

		return controller.create(new CatalogItemSpecListController(spec));
	}
}

module.exports = CatalogItemSpecListController;

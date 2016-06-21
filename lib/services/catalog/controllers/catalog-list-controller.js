'use strict';

const _ = require('lodash');

const controller = require('../../../controller');

class CatalogListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const args = {
			type: this.type,
			channel: req.identity.channel,
			platform: req.identity.platform
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
		const payload = _.cloneDeep(req.body);
		payload.type = this.type;
		payload.channel = req.identity.channel.id;

		this.bus
			.sendCommand({role: 'catalog', cmd: 'setItem'}, payload)
			.then(resource => {
				res.body = resource;
				res.status(201);
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

		return controller.create(new CatalogListController(spec));
	}
}

module.exports = CatalogListController;

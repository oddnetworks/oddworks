'use strict';

const _ = require('lodash');

const controller = require('../../../controllers/controller');

class CatalogItemSpecController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const args = {
			channel: req.identity.channel.id,
			type: this.type,
			id: req.params.id
		};

		this.bus
			.query({role: 'catalog', cmd: 'fetchItemSpec'}, args)
			.then(resource => {
				res.body = resource;
				next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const args = {
			channel: req.identity.channel.id,
			type: this.type,
			id: req.params.id
		};

		const payload = req.body;

		this.bus
			.query({role: 'catalog', cmd: 'fetchItemSpec'}, args)
			.then(resource => {
				resource = _.mergeDeep({}, resource, payload);
				resource.channel = args.channel;
				resource.type = this.type;
				resource.id = args.id;

				this.bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, resource);
				res.body = {};
				res.status(200);
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemSpecController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemSpecController spec.type is required');
		}

		return controller.create(new CatalogItemSpecController(spec));
	}
}

module.exports = CatalogItemSpecController;

'use strict';

const _ = require('lodash');

const controller = require('../../../controllers/controller');

class CatalogItemController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const args = {
			channel: req.identity.channel,
			type: this.type,
			id: req.params.id,
			platform: req.identity.platform,
			viewer: req.identity.viewer
		};

		if (req.query.include) {
			args.include = req.query.include.split(',');
		}

		this.bus
			.query({role: 'catalog', cmd: 'fetchItem'}, args)
			.then(resource => {
				res.body = resource;
				next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const payload = req.body;

		const args = {
			channel: req.identity.channel,
			type: this.type,
			id: req.params.id,
			platform: req.identity.platform,
			viewer: req.identity.viewer
		};

		this.bus
			.query({role: 'catalog', cmd: 'fetchItem'}, args)
			.then(resource => {
				resource = _.merge({}, resource, payload);
				resource.channel = args.channel;
				resource.type = type;
				resource.id = args.id;

				this.bus.sendCommand({role: 'catalog', cmd: 'setItem'}, resource);
				res.body = {};
				res.status(200);
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

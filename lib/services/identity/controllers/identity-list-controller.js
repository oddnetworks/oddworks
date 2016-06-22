'use strict';

const _ = require('lodash');

const controller = require('../../../controllers/controller');

class IdentityListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const limit = parseInt(req.query.limit, 10) || 10;

		return this.bus
			.query({role: 'store', cmd: 'scan', type: this.type}, {limit})
			.then(resources => {
				res.status(200);
				res.body = resources;
				return next();
			})
			.catch(next);
	}

	post(req, res, next) {
		const payload = req.body;

		return this.bus
			.sendCommand({role: 'store', cmd: 'set', type: this.type}, payload)
			.then(resource => {
				res.body = resource;
				res.status(201);
				return next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('IdentityListController spec.type is required');
		}

		return controller.create(new IdentityListController(spec));
	}
}

module.exports = IdentityListController;

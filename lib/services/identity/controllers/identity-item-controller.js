'use strict';

const _ = require('lodash');

const controller = require('../../../controller');
const respond = require('../../../respond');

class IdentityItemController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const id = req.params.id;

		this.bus
			.query({role: 'store', cmd: 'get', type: this.type}, {id})
			.then(resource => {
				res.body = resource;
				res.status(200);
				next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const payload = req.body;

		this.bus
			.query({role: 'store', cmd: 'get', type}, {id})
			.then(resource => {
				resource = _.mergeDeep({}, resource, payload);
				this.bus.sendCommand({role: 'store', cmd: 'set', type}, resource);
				res.body = {};
				res.status(200);
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityItemController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('IdentityItemController spec.type is required');
		}

		return controller.create(new IdentityItemController(spec));
	}
}

module.exports = IdentityItemController;

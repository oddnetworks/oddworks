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
				respond.ok(res, resource);
				next();
			})
			.catch(next);
	}

	put(req, res, next) {
		const payload = req.body;
		this.bus.sendCommand({role: 'store', cmd: 'set', type: this.type}, payload);
		respond.accepted(res);
		next();
	}

	patch(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const payload = req.body;

		this.bus
			.query({role: 'store', cmd: 'get', type}, {id})
			.then(resource => {
				resource = Object.assign(resource, payload);
				this.bus.sendCommand({role: 'store', cmd: 'set', type}, resource);
				respond.accepted(res, resource);
				next();
			});
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

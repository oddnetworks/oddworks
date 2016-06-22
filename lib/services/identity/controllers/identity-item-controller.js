'use strict';

const _ = require('lodash');

const controller = require('../../../controllers/controller');

class IdentityItemController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;

		const args = {
			type,
			id: req.params.id
		};

		if (type !== 'channel') {
			args.channel = req.identity.channel.id;
		}

		this.bus
			.query({role: 'store', cmd: 'get', type}, args)
			.then(resource => {
				res.body = resource;
				res.status(200);
				next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const payload = req.body;

		const args = {
			type,
			id: req.params.id
		};

		if (type !== 'channel') {
			args.channel = req.identity.channel.id;
		}

		this.bus
			.query({role: 'store', cmd: 'get', type}, args)
			.then(resource => {
				resource = _.mergeDeep({}, resource, payload);
				if (args.channel) {
					resource.channel = args.channel;
				}
				resource.type = type;
				resource.id = args.id;

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

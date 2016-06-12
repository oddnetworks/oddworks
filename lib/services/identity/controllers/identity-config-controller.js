'use strict';

const _ = require('lodash');

const controller = require('../../../controller');

class IdentityConfigController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const channel = req.identity.channel.id;
		const platform = req.identity.platform.id;

		this.bus
			.query({role: 'identity', cmd: 'config'}, {channel, platform})
			.then(resource => {
				res.body = resource;
				next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityConfigController spec.bus is required');
		}

		return controller.create(new IdentityConfigController(spec));
	}
}

module.exports = IdentityConfigController;

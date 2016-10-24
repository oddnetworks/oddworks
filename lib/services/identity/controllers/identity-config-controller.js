'use strict';

const _ = require('lodash');

const Controller = require('../../../controllers/controller');

class IdentityConfigController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const channel = req.identity.channel;
		const platform = req.identity.platform;

		return this.bus
			.query({role: 'identity', cmd: 'config'}, {channel, platform})
			.then(resource => {
				if (_.has(resource, 'features.authentication.proxy')) {
					delete resource.features.authentication.proxy;
				}
				if (_.has(resource, 'features.authentication.evaluators')) {
					delete resource.features.authentication.evaluators;
				}

				res.body = resource;
				next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityConfigController spec.bus is required');
		}

		return Controller.create(new IdentityConfigController(spec));
	}
}

module.exports = IdentityConfigController;

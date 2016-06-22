'use strict';

const _ = require('lodash');
const Boom = require('boom');

const controller = require('../../../controllers/controller');

class IdentityListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const limit = parseInt(req.query.limit, 10) || 10;
		const channel = req.query.channel || (req.identity.channel || {}).id;

		if (type !== 'channel' && !channel) {
			return next(Boom.badData('channel parameter is required'));
		}

		return this.bus
			.query({role: 'store', cmd: 'scan', type}, {channel, type, limit})
			.then(resources => {
				res.status(200);
				res.body = resources;
				return next();
			})
			.catch(next);
	}

	post(req, res, next) {
		const type = this.type;
		const payload = req.body;

		if (type !== 'channel' && !payload.channel) {
			return next(Boom.badData('"channel" is required'));
		}

		payload.type = type;

		return this.bus
			.sendCommand({role: 'store', cmd: 'set', type}, payload)
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

'use strict';

const _ = require('lodash');
const Boom = require('boom');

const controller = require('../../../controllers/controller');

class IdentityItemController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const channel = req.query.channel || (req.identity.channel || {}).id;

		if (type !== 'channel' && !channel) {
			return next(Boom.badRequest('channel parameter is required'));
		}

		const args = {
			type,
			id: req.params.id
		};

		if (type !== 'channel') {
			args.channel = channel;
		}

		return this.bus
			.query({role: 'store', cmd: 'get', type}, args)
			.then(resource => {
				res.body = resource;
				res.status(200);
				return next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const payload = req.body;
		const channel = payload.channel || (req.identity.channel || {}).id;

		if (type !== 'channel' && !channel) {
			return next(Boom.badData('"channel" is required'));
		}

		const args = {
			type,
			id: req.params.id
		};

		if (type !== 'channel') {
			args.channel = channel;
		}

		return this.bus
			.query({role: 'store', cmd: 'get', type}, args)
			.then(resource => {
				if (!resource) {
					return next(Boom.notFound(`cannot find ${type} ${args.id}`));
				}

				resource = _.merge({}, resource, payload);
				if (args.channel) {
					resource.channel = args.channel;
				}
				resource.type = type;
				resource.id = args.id;

				return this.bus.sendCommand({role: 'store', cmd: 'set', type}, resource);
			})
			.then(resource => {
				res.body = resource;
				res.status(200);
				return next();
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

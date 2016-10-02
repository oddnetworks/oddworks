'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class IdentityListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const limit = parseInt(req.query.limit, 10) || 10;
		const channel = (req.identity.channel || {}).id || req.query.channel;

		if (type !== 'channel' && !channel) {
			return next(Boom.badRequest('channel parameter is required'));
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
		const payload = _.cloneDeep(req.body || {});
		payload.type = type;
		let channelId = (req.identity.channel || {}).id;

		// TODO should none admin audience be able to post a new channel?
		if (type === 'channel') {
			channelId = payload.id;
		}

		if (type === 'channel') {
			return this.bus
				.sendCommand({role: 'store', cmd: 'set', type}, payload)
				.then(resource => {
					res.body = resource;
					res.status(201);
					return next();
				})
				.catch(next);
		}

		return controller.postFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				payload.channel = channel.id;

				return this.bus.sendCommand({role: 'store', cmd: 'set', type}, payload);
			})
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

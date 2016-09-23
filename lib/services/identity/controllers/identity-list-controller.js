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
		const payload = req.body;
		payload.type = type;
		let channelId = (req.identity.channel || {}).id;

		// only allow channel from the payload from an admin
		if (!channelId && (req.identity.audience || []).indexOf('admin') > -1) {
			channelId = (payload || {}).channel;
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

		let promise;
		if (req.identity.channel) {
			promise = Promise.resolve(req.identity.channel);
		} else if (channelId) {
			promise = this.bus.query(
				{role: 'store', cmd: 'get', type: 'channel'},
				{type: 'channel', id: channelId}
			);
		} else {
			return next(Boom.badData('"channel" is required'));
		}

		return promise
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				payload.channel = channel.id;

				return this.bus.sendCommand({cmd: 'set', role: 'store', type}, payload);
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

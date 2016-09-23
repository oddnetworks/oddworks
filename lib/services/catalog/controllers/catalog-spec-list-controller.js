'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const controller = require('../../../controllers/controller');

class CatalogItemSpecListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const channelId = req.query.channel || (req.identity.channel || {}).id;
		const limit = parseInt(req.query.limit, 10) || 10;

		let promise;
		if (req.identity.channel) {
			promise = Promise.resolve(req.identity.channel);
		} else if (channelId) {
			promise = this.bus.query(
				{role: 'store', cmd: 'get', type: 'channel'},
				{type: 'channel', id: channelId}
			);
		} else {
			return next(Boom.badRequest('channel parameter is required'));
		}

		return promise
			.then(channel => {
				if (!channel) {
					return next(Boom.badData(`channel ${channelId} does not exist`));
				}

				const args = {channel, type, limit};

				return this.bus
					.query({role: 'catalog', cmd: 'fetchItemSpecList'}, args);
			})
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
		let channelId = (req.identity.channel || {}).id;

		// only allow channel from the payload from an admin
		if (!channelId && (req.identity.audience || []).indexOf('admin') >= 0) {
			channelId = (payload || {}).channel;
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
				payload.type = type;

				return this.bus.sendCommand(
					{role: 'catalog', cmd: 'setItemSpec'},
					payload
				);
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
			throw new Error('CatalogItemSpecListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemSpecListController spec.type is required');
		}

		return controller.create(new CatalogItemSpecListController(spec));
	}
}

module.exports = CatalogItemSpecListController;

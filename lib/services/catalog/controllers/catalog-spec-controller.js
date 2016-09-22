'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const controller = require('../../../controllers/controller');

class CatalogItemSpecController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const channel = req.identity.channel;
		const channelId = req.query.channel;

		if (req.query.include) {
			return next(Boom.badRequest(
				'The "include" parmeter is not supported for spec resources'
			));
		}

		let promise;
		if (channel) {
			promise = Promise.resolve(channel);
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

				const args = {channel, type, id};

				return this.bus
					.query({role: 'catalog', cmd: 'fetchItemSpec'}, args);
			})
			.then(resource => {
				res.body = resource;
				return next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const channel = req.identity.channel;
		const channelId = req.query.channel;
		const payload = req.body;
		const id = req.params.id;

		let promise;
		if (channel) {
			promise = Promise.resolve(channel);
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
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				const args = {channel, type, id};

				return this.bus.query({role: 'catalog', cmd: 'fetchItemSpec'}, args);
			})
			.then(resource => {
				if (!resource) {
					return next(Boom.notFound(`cannot find ${type} ${id}`));
				}

				resource = _.merge({}, resource, payload);
				resource.channel = channel.id;
				resource.type = this.type;
				resource.id = id;

				return this.bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, resource);
			})
			.then(resource => {
				res.body = resource;
				res.status(200);
				return next();
			})
			.catch(next);
	}

	delete(req, res, next) {
		const channel = req.identity.channel;
		const channelId = channel ? channel.id : req.query.channel;

		if (!channelId) {
			return next(Boom.badRequest('channel parameter is required'));
		}

		const args = {
			channel: channelId,
			type: this.type,
			id: req.params.id
		};

		return this.bus
			.sendCommand({role: 'catalog', cmd: 'removeItemSpec'}, args)
			.then(result => {
				if (result) {
					res.status(200);
				} else {
					res.status(404);
				}

				res.body = {};
				return next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemSpecController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemSpecController spec.type is required');
		}

		return controller.create(new CatalogItemSpecController(spec));
	}
}

module.exports = CatalogItemSpecController;

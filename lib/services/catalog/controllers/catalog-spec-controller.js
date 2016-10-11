'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class CatalogItemSpecController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const channelId = (req.identity.channel || {}).id;

		if (req.query.include) {
			return next(Boom.badRequest(
				'The "include" parmeter is not supported for spec resources'
			));
		}

		return controller.getFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`channel ${channelId} does not exist`));
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
		let channelId = (req.identity.channel || {}).id;
		const payload = req.body;
		const id = req.params.id;

		return controller.patchIdentityFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}
				channelId = channel.id;
				const args = {channel, type, id};

				return this.bus.query({role: 'catalog', cmd: 'fetchItemSpec'}, args);
			})
			.then(resource => {
				if (!resource) {
					return next(Boom.notFound(`cannot find ${type} ${id}`));
				}

				resource = _.merge({}, resource, payload);
				resource.channel = channelId;
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

		return Controller.create(new CatalogItemSpecController(spec));
	}
}

module.exports = CatalogItemSpecController;

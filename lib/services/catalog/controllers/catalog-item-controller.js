'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class CatalogItemController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const channelId = (req.identity.channel || {}).id;

		const args = {
			type: this.type,
			id: req.params.id,
			platform: req.identity.platform,
			viewer: req.identity.viewer
		};

		if (req.query.include) {
			args.include = req.query.include.split(',');
		}

		return controller.getFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				args.channel = channel;
				return this.bus.query({role: 'catalog', cmd: 'fetchItem'}, args);
			})
			.then(resource => {
				res.body = resource;
				next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const payload = req.body;
		let channelId = (req.identity.channel || {}).id;

		const args = {
			type: this.type,
			id: req.params.id,
			platform: req.identity.platform,
			viewer: req.identity.viewer
		};

		return controller.patchFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}
				channelId = channel.id;
				args.channel = channel;
				return this.bus.query({role: 'catalog', cmd: 'fetchItem'}, args);
			})
			.then(resource => {
				resource = _.merge({}, resource, payload);
				resource.channel = channelId;
				resource.type = type;
				resource.id = args.id;
				return this.bus.sendCommand({role: 'catalog', cmd: 'setItem'}, resource);
			})
			.then(resource => {
				res.body = resource;
				res.status(200);
				return next();
			})
			.catch(next);
	}

	delete(req, res, next) {
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

		this.bus.sendCommand({role: 'catalog', cmd: 'removeItem', type}, args)
			.then(() => {
				res.body = {};
				res.status(202);
				return next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemController spec.type is required');
		}

		return controller.createController(new CatalogItemController(spec));
	}
}

module.exports = CatalogItemController;

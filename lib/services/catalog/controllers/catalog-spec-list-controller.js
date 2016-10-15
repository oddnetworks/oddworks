'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class CatalogItemSpecListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const channelId = (req.identity.channel || {}).id;
		const limit = parseInt(req.query.limit, 10) || 10;

		return controller.getFetchChannel({req, next, bus: this.bus})
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
		const payload = _.cloneDeep(req.body || {});
		const channelId = (req.identity.channel || {}).id;

		return controller.postFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}
				payload.channel = channel.id;
				payload.type = type;

				return this.bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, payload)
					.catch(err => {
						return next(Boom.badData(err.message));
					});
			})
			.then(resource => {
				res.body = resource;
				res.status(201);
				return next();
			});
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemSpecListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemSpecListController spec.type is required');
		}

		return Controller.create(new CatalogItemSpecListController(spec));
	}
}

module.exports = CatalogItemSpecListController;

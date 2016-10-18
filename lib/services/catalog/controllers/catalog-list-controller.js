'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class CatalogListController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const channelId = (req.identity.channel || {}).id;
		const limit = parseInt(req.query.limit, 10) || 10;

		const args = {
			type: this.type,
			id: req.params.id,
			platform: req.identity.platform,
			viewer: req.identity.viewer,
			limit
		};

		if (req.query.include) {
			return next(Boom.badRequest('The include query is not supported on this endpoint.'));
		}

		return controller.getFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				args.channel = channel;
				return this.bus.query({role: 'catalog', cmd: 'fetchItemList'}, args);
			})
			.then(resources => {
				res.status(200);
				res.body = resources;
				next();
			})
			.catch(next);
	}

	post(req, res, next) {
		const payload = _.cloneDeep(req.body || {});
		const type = this.type;
		const channelId = (req.identity.channel || {}).id;

		return controller.postFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				payload.channel = channel.id;
				payload.type = type;

				return this.bus.sendCommand({role: 'catalog', cmd: 'setItem'}, payload);
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
			throw new Error('CatalogListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogListController spec.type is required');
		}

		return Controller.create(new CatalogListController(spec));
	}
}

module.exports = CatalogListController;

'use strict';

const _ = require('lodash');

const Controller = require('../../../controllers/controller');

class CatalogListController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const platform = req.identity.platform;
		const viewer = req.identity.viewer;
		const limit = parseInt(req.query.limit, 10) || 10;

		return this.getChannel(req)
			.then(channel => {
				const args = {channel, type, platform, viewer, limit};
				return this.bus.query({role: 'catalog', cmd: 'fetchItemList'}, args);
			})
			.then(resources => {
				res.status(200);
				res.body = resources;
				next();
				return null;
			})
			.catch(next);
	}

	post(req, res, next) {
		const type = this.type;
		const payload = _.cloneDeep(req.body || {});

		return this.getChannel(req)
			.then(channel => {
				payload.channel = channel.id;
				payload.type = type;
				return this.bus.sendCommand({role: 'catalog', cmd: 'setItem'}, payload);
			})
			.then(resource => {
				res.body = resource;
				res.status(201);
				next();
				return null;
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

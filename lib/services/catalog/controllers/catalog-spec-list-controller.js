'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class CatalogItemSpecListController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const limit = parseInt(req.query.limit, 10) || 10;

		if (req.query.include) {
			return next(Boom.badRequest(
				'The "include" parmeter is not supported for spec resources'
			));
		}

		return this.getChannel(req)
			.then(channel => {
				const args = {channel, type, limit};
				return this.bus.query({role: 'catalog', cmd: 'fetchItemSpecList'}, args);
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
				return this.bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, payload);
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
			throw new Error('CatalogItemSpecListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemSpecListController spec.type is required');
		}

		return Controller.create(new CatalogItemSpecListController(spec));
	}
}

module.exports = CatalogItemSpecListController;

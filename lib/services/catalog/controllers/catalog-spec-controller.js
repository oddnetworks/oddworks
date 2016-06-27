'use strict';

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
		const channel = req.query.channel || (req.identity.channel || {}).id;

		if (!channel) {
			return next(Boom.badRequest('channel parameter is required'));
		}

		const args = {
			channel,
			type,
			id: req.params.id
		};

		return this.bus
			.query({role: 'catalog', cmd: 'fetchItemSpec'}, args)
			.then(resource => {
				res.status(200);
				res.body = resource;
				return next();
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const channel = req.query.channel || (req.identity.channel || {}).id;

		if (!channel) {
			return next(Boom.badRequest('channel parameter is required'));
		}

		const args = {
			channel,
			type,
			id: req.params.id
		};

		const payload = req.body;

		return this.bus
			.query({role: 'catalog', cmd: 'fetchItemSpec'}, args)
			.then(resource => {
				if (!resource) {
					return next(Boom.notFound(`cannot find ${type} ${args.id}`));
				}

				resource = _.merge({}, resource, payload);
				resource.channel = args.channel;
				resource.type = this.type;
				resource.id = args.id;

				this.bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, resource);
				res.body = {};
				res.status(200);
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

'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class CatalogItemSpecController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const id = req.params.id;

		if (req.query.include) {
			return next(Boom.badRequest(
				'The "include" parmeter is not supported for spec resources'
			));
		}

		return this.getChannel(req)
			.then(channel => {
				const args = {channel, type, id};
				return this.bus.query({role: 'catalog', cmd: 'fetchItemSpec'}, args);
			})
			.then(resource => {
				if (!resource) {
					return Promise.reject(Boom.notFound(`${type} "${id}" not found`));
				}

				res.body = resource;
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const payload = req.body;
		let channelId;

		if (!payload.source || !_.isString(payload.source)) {
			return next(Boom.badData('A "source" attribute is required to update a content spec'));
		}

		return this.getChannel(req)
			.then(channel => {
				channelId = channel.id;
				const args = {channel, type, id};
				return this.bus.query({role: 'catalog', cmd: 'fetchItemSpec'}, args);
			})
			.then(resource => {
				if (resource) {
					resource = _.merge({}, resource, payload);
					resource.type = type;
					resource.id = id;
					resource.channel = channelId;
					return this.bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, resource);
				}

				return Promise.reject(Boom.notFound(`${type} "${id}" not found.`));
			})
			.then(resource => {
				res.body = resource;
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	delete(req, res, next) {
		const type = this.type;
		const id = req.params.id;

		return this.getChannel(req)
			.then(channel => {
				const args = {channel: channel.id, type, id};
				return this.bus.sendCommand({role: 'catalog', cmd: 'removeItemSpec'}, args);
			})
			.then(() => {
				res.body = {};
				res.status(200);
				next();
				return null;
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

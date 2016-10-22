'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class CatalogItemController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const platform = req.identity.platform;
		const viewer = req.identity.viewer;

		if (!platform && !this.isAdminRequest(req)) {
			return next(Boom.badRequest(
				'A JSON Web Token with a platform is required in a platform request'
			));
		}

		return this.getChannel(req)
			.then(channel => {
				const args = {type, id};

				// When no platform ID is present in the JWT during an admin role request,
				// the query for the resource is made directly to the store instead of through
				// the catalog service.
				if (!platform) {
					args.channel = channel.id;
					return this.bus.query({role: 'store', cmd: 'get', type}, args);
				}

				args.channel = channel;
				args.platform = platform;
				args.viewer = viewer;
				return this.bus.query({role: 'catalog', cmd: 'fetchItem'}, args);
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

		return this.getChannel(req)
			.then(channel => {
				channelId = channel.id;

				// We don't use role: 'catalog', cmd: 'fetchItem' here like you'd expect.
				// Instead, we query the store directly to avoid the caching and
				// provider logic in fetchItem.
				const args = {channel: channelId, type, id};
				return this.bus.query({role: 'store', cmd: 'get', type}, args);
			})
			.then(resource => {
				if (resource) {
					resource = _.merge({}, resource, payload);
					resource.type = type;
					resource.id = id;
					resource.channel = channelId;
					return this.bus.sendCommand({role: 'catalog', cmd: 'setItem'}, resource);
				}

				return Promise.reject(Boom.notFound(`${type} "${id}" not found`));
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
				return this.bus.sendCommand({role: 'catalog', cmd: 'removeItem'}, args);
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
			throw new Error('CatalogItemController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemController spec.type is required');
		}

		return Controller.create(new CatalogItemController(spec));
	}
}

module.exports = CatalogItemController;

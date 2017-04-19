'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const utils = require('../../../utils');
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
		let channel;

		if (!platform && !this.isAdminRequest(req)) {
			return next(Boom.badRequest(
				'A JSON Web Token with a platform is required in a platform request'
			));
		}

		return this.getChannel(req)
			.then(chan => {
				channel = chan;

				const args = {type, id};

				if (req.query.include) {
					args.include = req.query.include.split(',');
				}

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

				// Find and return viewer progress if appropriate.
				if (viewer && resource.type === 'video') {
					return this.bus.query(
						{role: 'store', cmd: 'get', type: 'progress'},
						{id: `${resource.id}:${viewer.id}`, type: 'progress', channel: channel.id}
					);
				}

				return false;
			})
			.then(progress => {
				if (progress) {
					res.body.position = progress.position || 0;
					res.body.complete = progress.complete || false;
				}

				// Get viewer progress if required for all the included assets.
				if (viewer && res.body.included) {
					return Promise.all(res.body.included.map(resource => {
						if (resource.type === 'video') {
							const args = {id: `${resource.id}:${viewer.id}`, type: 'progress', channel: channel.id};
							return this.bus.query({role: 'store', cmd: 'get', type: 'progress'}, args).then(progress => {
								progress = progress || {};
								resource.position = progress.position || 0;
								resource.complete = progress.complete || false;
								return resource;
							});
						}

						return resource;
					}));
				}

				return null;
			})
			.then(() => {
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	patch(req, res, next) {
		if (!this.isAdminRequest(req)) {
			return next(Boom.forbidden(`Non admins may not update resources`));
		}

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
					resource = utils.updateObject(resource, payload);
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
		if (!this.isAdminRequest(req)) {
			return next(Boom.forbidden(`Non admins may not delete resources`));
		}

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

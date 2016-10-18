'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class IdentityListController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const limit = parseInt(req.query.limit, 10) || 10;
		const args = {type, limit};

		return this.getChannel(req)
			.then(channel => {
				// If this is not a channel resource, then it must belong to a channel
				// which we reference here with the .channel attribute.
				if (type !== 'channel') {
					args.channel = channel.id;
				}

				return this.bus.query({role: 'store', cmd: 'scan', type}, args);
			})
			.then(resources => {
				// If we're querying for channel resources and this is not an admin request,
				// then we filter out all channel resources from the response other than the
				// one which matches the one the caller is authenticated for.
				if (type === 'channel' && !this.isAdminRequest(req)) {
					const channelId = (req.identity.channel || {}).id;
					resources = resources.filter(item => {
						return item.id === channelId;
					});
				}

				res.status(200);
				res.body = resources.slice(0, limit);
				next();
				return null;
			})
			.catch(next);
	}

	post(req, res, next) {
		const type = this.type;
		const payload = _.cloneDeep(req.body);
		payload.type = type;

		return this.getChannel(req)
			.then(channel => {
				// If this is not a channel resource, then it must belong to a channel
				// which we reference here with the .channel attribute.
				if (type !== 'channel') {
					payload.channel = channel.id;
				}

				// If there is a client defined id, then we check the store for a
				// conflict before moving on.
				if (payload.id) {
					const args = {type, id: payload.id};

					if (type !== 'channel') {
						args.channel = channel.id;
					}
					return this.bus.query({role: 'store', cmd: 'get', type}, args);
				}

				return null;
			})
			.then(resource => {
				// Return a 409 error if there was a conflict in the store.
				if (resource) {
					return Promise.reject(Boom.conflict(`The ${type} "${payload.id}" already exists`));
				}
				return this.bus.sendCommand({role: 'store', cmd: 'set', type}, payload);
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
			throw new Error('IdentityListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('IdentityListController spec.type is required');
		}

		return Controller.create(new IdentityListController(spec));
	}
}

module.exports = IdentityListController;

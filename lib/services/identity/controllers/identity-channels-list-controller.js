'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');
const IdentityListController = require('./identity-list-controller');

class IdentityChannelsListController extends IdentityListController {
	get(req, res, next) {
		const type = 'channel';
		const limit = parseInt(req.query.limit, 10) || 10;
		const args = {type, limit};

		const err = this.checkChannelAccess(req);
		if (err) {
			return next(err);
		}

		return this.bus.query({role: 'store', cmd: 'scan', type}, args)
			.then(resources => {
				// If this is not an admin request then we filter out all channel
				// resources from the response other than the one which matches the
				// one the caller is authenticated for.
				if (!this.isAdminRequest(req)) {
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
		const type = 'channel';
		const payload = _.cloneDeep(req.body);
		payload.type = type;

		// If there is a client defined id, then we check the store for a
		// conflict before moving on.
		let existingResource;
		if (payload.id) {
			const args = {type, id: payload.id};
			existingResource = this.bus.query({role: 'store', cmd: 'get', type}, args);
		} else {
			existingResource = Promise.resolve(null);
		}

		return existingResource
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

	checkChannelAccess(req) {
		if (this.isAdminRequest(req)) {
			return null;
		}

		const channelId = _.get(req, 'identity.channel.id');
		if (!channelId) {
			return Boom.forbidden('Non admin callers must have a channel embedded in the JSON Web Token');
		}

		return null;
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityChannelsListController spec.bus is required');
		}

		return Controller.create(new IdentityChannelsListController({
			bus: spec.bus,
			type: 'channel'
		}));
	}
}

module.exports = IdentityChannelsListController;

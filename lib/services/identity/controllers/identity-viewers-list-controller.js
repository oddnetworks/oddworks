'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');
const IdentityListController = require('./identity-list-controller');

class IdentityViewersListController extends IdentityListController {
	constructor(spec) {
		super(spec);
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = 'viewer';
		const limit = parseInt(req.query.limit, 10) || 10;
		const args = {type, limit};

		const err = this.checkViewerAccess(req);
		if (err) {
			return next(err);
		}

		return this.getChannel(req)
			.then(channel => {
				args.channel = channel.id;
				return this.bus.query({role: 'store', cmd: 'scan', type}, args);
			})
			.then(resources => {
				// If this is not an admin request then we filter out all viewer
				// resources from the response other than the one which matches the
				// one the caller is authenticated for.
				if (!this.isAdminRequest(req)) {
					const viewerId = (req.identity.viewer || {}).id;
					resources = resources.filter(item => {
						return item.id === viewerId;
					});
				}

				res.status(200);
				res.body = resources.slice(0, limit);
				next();
				return null;
			})
			.catch(next);
	}

	// POST just proxies to the parent class.
	// post(req, res, next) {
	// }

	checkChannelAccess(req) {
		if (this.isAdminRequest(req)) {
			return null;
		}

		if (!_.get(req, 'identity.viewer.id')) {
			return Boom.forbidden('Non admin callers must have a viewer embedded in the JSON Web Token');
		}

		return null;
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityViewersListController spec.bus is required');
		}

		return Controller.create(new IdentityViewersListController(spec));
	}
}

module.exports = IdentityViewersListController;

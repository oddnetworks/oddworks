'use strict';

const _ = require('lodash');
const bcrypt = require('bcrypt');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class IdentityLoginController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	post(req, res, next) {
		const payload = _.cloneDeep(req.body || {});
		const channelId = (req.identity.channel || {}).id;
		const platformId = (req.identity.platform || {}).id;
		let viewer;

		return controller.postFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				// Fetch the viewer by channel and id (email)
				const args = {
					id: payload.email,
					type: 'viewer',
					channel: channelId
				};

				return this.bus.query({role: 'store', cmd: 'get', type: 'viewer'}, args);
			})
			.then(resource => {
				viewer = resource;

				// Verify the password is correct
				if (!bcrypt.compareSync(payload.password, viewer.password)) {
					return next(Boom.unauthorized());
				}

				// Build a viewer JWT and sign it
				const jwt = {
					channel: channelId,
					platform: platformId,
					viewer: viewer.email,
					audience: ['platform']
				};

				return this.bus.query({role: 'identity', cmd: 'sign'}, jwt);
			})
			.then(jwt => {
				// Attach the JWT to the viewer and respond for a successful login
				viewer.jwt = jwt;

				// Scrub the password from the viewer before responding
				delete viewer.password;

				res.body = viewer;
				res.status(200);
				return next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityLoginController spec.bus is required');
		}

		return Controller.create(new IdentityLoginController(spec));
	}
}

module.exports = IdentityLoginController;

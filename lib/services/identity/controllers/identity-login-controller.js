'use strict';

const _ = require('lodash');
const bcrypt = require('bcrypt');
const superagent = require('superagent');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

const controller = new Controller();

class IdentityLoginController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	post(req, res, next) {
		const channelId = (req.identity.channel || {}).id;

		return controller.postFetchChannel({req, next, bus: this.bus})
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				return (channel.features.authentication.url) ? proxyAuth(this.bus, req, res, next) : nativeAuth(this.bus, req, res, next);
			})
			.then(viewer => {
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

function proxyAuth(bus, req, res, next) {
	let viewer;
	let proxyJWT;

	return superagent
		.post(req.identity.channel.features.authentication.url)
		.send(req.body)
		.then(response => {
			if (!res.ok) {
				return next(Boom.unauthorized());
			}

			proxyJWT = response.body.attributes.jwt;
			const args = {
				id: req.body.payload.email,
				type: 'viewer',
				channel: req.identity.channel.id
			};

			return bus.query({role: 'store', cmd: 'get', type: 'viewer'}, args);
		})
		.then(resource => {
			viewer = resource;

			// Viewer does not exist, but proxy auth was successful so create a viewer
			if (!viewer) {
				viewer = {
					id: req.body.payload.email,
					entitlements: [],
					relationships: {
						platforms: {
							data: [
								{id: req.identity.platform.id, type: 'platform'}
							]
						},
						watchlist: {data: []}
					},
					meta: {}
				};
			}

			const jwt = {
				channel: req.identity.channel.id,
				platform: req.identity.platform.id,
				viewer: req.body.payload.email,
				audience: ['platform']
			};

			// Store the proxy's JWT on the viewer meta for re-auth later and save the viewer
			viewer.meta.jwt = proxyJWT;
			bus.sendCommand({role: 'store', cmd: 'set', type: 'viewer'}, viewer);

			return bus.query({role: 'identity', cmd: 'sign'}, jwt);
		})
		.then(jwt => {
			// Attach the JWT to the viewer and respond for a successful login
			viewer.jwt = jwt;

			// Scrub the password from the viewer before responding
			delete viewer.password;

			return viewer;
		});
}

function nativeAuth(bus, req, res, next) {
	let viewer;

	// Fetch the viewer by channel and id (email)
	const args = {
		id: req.body.payload.email,
		type: 'viewer',
		channel: req.identity.channel.id
	};

	return bus.query({role: 'store', cmd: 'get', type: 'viewer'}, args)
		.then(resource => {
			viewer = resource;

			// Verify the password is correct
			if (!bcrypt.compareSync(req.body.payload.password, viewer.password)) {
				return next(Boom.unauthorized());
			}

			// Build a viewer JWT and sign it
			const jwt = {
				channel: req.identity.channel.id,
				platform: req.identity.platform.id,
				viewer: req.body.payload.email,
				audience: ['platform']
			};

			return bus.query({role: 'identity', cmd: 'sign'}, jwt);
		})
		.then(jwt => {
			// Attach the JWT to the viewer and respond for a successful login
			viewer.jwt = jwt;

			// Scrub the password from the viewer before responding
			delete viewer.password;

			return viewer;
		});
}

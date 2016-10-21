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

		return controller.getChannel(req)
			.then(channel => {
				if (!channel) {
					return next(Boom.conflict(`Channel ${channelId} does not exist.`));
				}

				let authPromise;

				if (channel.features.authentication.enabled && channel.features.authentication.url) {
					authPromise = proxyAuth(this.bus, req, res, next);
				} else if (channel.features.authentication.enabled) {
					authPromise = nativeAuth(this.bus, req, res, next);
				} else {
					return next(Boom.notFound());
				}

				return authPromise;
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
	let proxyResponse;

	const body = {
		data: {
			type: 'authentication',
			attributes: {
				email: req.body.email,
				password: req.body.password
			}
		}
	};

	return superagent
		.post(req.identity.channel.features.authentication.url)
		.send(body)
		.then(response => {
			if (!response.ok) {
				return next(Boom.unauthorized());
			}

			proxyResponse = response;

			const args = {
				id: req.body.email,
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
					id: req.body.email,
					type: 'viewer',
					channel: req.identity.channel.id,
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

			// Store the proxy's entitlements and JWT on the viewer
			_.set(
				viewer, 'entitlements',
				_.get(proxyResponse, 'body.data.attributes.entitlements', [])
			);

			_.set(
				viewer, 'meta.jwt',
				_.get(proxyResponse, 'body.data.meta.jwt', '')
			);
			return bus.sendCommand({role: 'store', cmd: 'set', type: 'viewer'}, viewer);
		})
		.then(resource => {
			// Build the Odd JWT payload to send back to the device on successful login
			const payload = {
				channel: req.identity.channel.id,
				platform: req.identity.platform.id,
				viewer: resource.id,
				audience: ['platform']
			};

			return bus.query({role: 'identity', cmd: 'sign'}, payload);
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
		id: req.body.email,
		type: 'viewer',
		channel: req.identity.channel.id
	};

	return bus.query({role: 'store', cmd: 'get', type: 'viewer'}, args)
		.then(resource => {
			viewer = resource;

			// Verify the password is correct
			if (!bcrypt.compareSync(req.body.password, viewer.password)) {
				return next(Boom.unauthorized());
			}

			// Build a viewer JWT and sign it
			const jwt = {
				channel: req.identity.channel.id,
				platform: req.identity.platform.id,
				viewer: req.body.email,
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

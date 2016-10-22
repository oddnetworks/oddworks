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

				if (!channel.features.authentication.enabled) {
					return next(Boom.notFound());
				}

				let loginPromise;

				if (_.has(channel, 'features.authentication.proxy')) {
					loginPromise = proxyLogin(this.bus, req, res, next);
				} else if (_.has(channel, 'features.authentication.evaluators')) {
					try {
						const loginEvaluator = eval(`(${channel.features.authentication.evaluators.login})`); // eslint-disable-line no-eval
						loginPromise = loginEvaluator(this.bus, req, res, next).then(buildViewerJWT(this.bus, req, res, next));
					} catch (err) {
						console.log(err.stack);
						return next(Boom.wrap(err));
					}
				} else {
					loginPromise = nativeLogin(this.bus, req, res, next);
				}

				return loginPromise;
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

function proxyLogin(bus, req, res, next) {
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
		.post(req.identity.channel.features.authentication.proxy.login)
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
		.then(buildViewerJWT(bus, req, res, next));
}

function nativeLogin(bus, req, res, next) {
	// Fetch the viewer by channel and id (email)
	const args = {
		id: req.body.email,
		type: 'viewer',
		channel: req.identity.channel.id
	};

	return bus.query({role: 'store', cmd: 'get', type: 'viewer'}, args)
		.then(viewer => {
			// Verify the password is correct
			if (!bcrypt.compareSync(req.body.password, viewer.password)) {
				return next(Boom.unauthorized());
			}

			return viewer;
		})
		.then(buildViewerJWT(bus, req, res, next));
}

function buildViewerJWT(bus, req) {
	return viewer => {
		const jwt = {
			channel: req.identity.channel.id,
			platform: req.identity.platform.id,
			viewer: viewer.id,
			audience: ['platform']
		};

		return bus
			.query({role: 'identity', cmd: 'sign'}, jwt)
			.then(jwt => {
				// Attach the JWT to the viewer and respond for a successful login
				viewer.jwt = jwt;

				// Scrub the password from the viewer before responding
				delete viewer.password;

				return viewer;
			});
	};
}

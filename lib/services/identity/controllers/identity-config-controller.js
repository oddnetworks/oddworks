'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

const Controller = require('../../../controllers/controller');

class IdentityConfigController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const channel = req.identity.channel;
		const platform = req.identity.platform;
		let viewer = req.identity.viewer;

		return this.bus
			.query({role: 'identity', cmd: 'config'}, {channel, platform, viewer})
			.then(resource => {
				if (viewer) {
					return resource;
				}

				// Create the viewer if none exists.
				const id = uuid.v4();
				viewer = {id, channel: channel.id, type: 'viewer'};
				const payload = {channel: channel.id, platform: platform.id, viewer: id, audience: ['platform']};

				return Promise.join(
					this.bus.sendCommand({role: 'store', cmd: 'set', type: 'viewer'}, viewer),
					this.bus.query({role: 'identity', cmd: 'sign'}, payload),
					(viewer, jwt) => {
						resource.viewer = viewer;
						resource.jwt = jwt;
						return resource;
					}
				);
			})
			.then(resource => {
				res.body = resource;
				next();
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityConfigController spec.bus is required');
		}

		return Controller.create(new IdentityConfigController(spec));
	}
}

module.exports = IdentityConfigController;

'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');

const controller = require('../../../controllers/controller');

class IdentityConfigController {
	constructor(spec) {
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const channel = req.identity.channel;
		const platform = req.identity.platform;
		const user = req.identity.user;

		this.bus
			.query({role: 'identity', cmd: 'config'}, {channel, platform, user})
			.then(resource => {
				if (user) {
					return resource;
				} else { // eslint-disable-line no-else-return
					const id = uuid.v4();
					const user = {id, channel: channel.id, type: 'user'};
					const payload = {channel: channel.id, platform: platform.id, user: id, audience: ['platform']};

					return Promise.join(
						this.bus.sendCommand({role: 'store', cmd: 'set', type: 'user'}, user),
						this.bus.query({role: 'identity', cmd: 'sign'}, payload),
						(user, jwt) => {
							resource.jwt = jwt;
							return resource;
						}
					);
				}
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

		return controller.create(new IdentityConfigController(spec));
	}
}

module.exports = IdentityConfigController;

'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

class Controller {
	isAdminRequest(req) {
		return (req.identity.audience || []).indexOf('admin') >= 0;
	}

	getChannel(req) {
		if (this.isAdminRequest(req)) {
			const channelId = (req.query || {}).channel || (req.body || {}).channel;

			if (channelId) {
				return this.bus.query(
					{role: 'store', cmd: 'get', type: 'channel'},
					{type: 'channel', id: channelId}
				).then(channel => {
					if (channel) {
						return channel;
					}

					return Promise.reject(Boom.forbidden(`Channel "${channelId}" does not exist`));
				});
			} else if (req.identity.channel) {
				return Promise.resolve(req.identity.channel);
			}

			const method = req.method.toUpperCase();
			if (method === 'GET' || method === 'DELETE') {
				return Promise.reject(Boom.badRequest('The "channel" query parameter is required'));
			}
			return Promise.reject(Boom.badData('The "channel" attribute is required'));
		}

		const channel = req.identity.channel;
		if (channel) {
			return Promise.resolve(channel);
		}

		return Promise.reject(Boom.forbidden(
			'Non admin callers must have a channel embedded in the JSON Web Token'
		));
	}

	static create(controller) {
		return function requestHandler(req, res, next) {
			const method = req.method.toLowerCase();
			const handler = controller[method];

			if (_.isFunction(handler)) {
				handler.call(controller, req, res, next); /* eslint-disable-line prefer-reflect */
			} else {
				next(Boom.methodNotAllowed());
			}
		};
	}
}

module.exports = Controller;

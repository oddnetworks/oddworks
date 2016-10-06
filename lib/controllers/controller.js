'use strict';

const _ = require('lodash');
const Boom = require('boom');

class Controller {
	fetchChannel(args) {
		let promise;
		if (args.req.identity.channel) {
			promise = Promise.resolve(args.req.identity.channel);
		} else if (args.channelId) {
			promise = args.bus.query(
				{role: 'store', cmd: 'get', type: 'channel'},
				{type: 'channel', id: args.channelId}
			);
		} else {
			return args.next(Boom.badData('"channel" is required'));
		}
		return promise;
	}

	getFetchChannel(args) {
		let channelId = (args.req.identity.channel || {}).id;

		if (!channelId && (args.req.identity.audience || []).indexOf('admin') >= 0) {
			channelId = args.req.query.channel || '';

			if (!channelId) {
				return args.next(Boom.badData('On admin get request, query.channel is required'));
			}
		}
		args.channelId = channelId;
		return this.fetchChannel(args);
	}

	patchFetchChannel(args) {
		let channelId = (args.req.identity.channel || {}).id;

		if (!channelId && (args.req.identity.audience || []).indexOf('admin') >= 0) {
			channelId = (args.req.body.channel || {}).id;

			if (!channelId) {
				return args.next(Boom.badData('On admin patch request, a channel object on the payload is required'));
			}
		}
		args.channelId = channelId;
		return this.fetchChannel(args);
	}

	patchIdentityFetchChannel(args) {
		let channelId = (args.req.identity.channel || {}).id;

		if (!channelId && (args.req.identity.audience || []).indexOf('admin') >= 0) {
			const payload = args.req.body;
			channelId = payload.channel || payload.id;

			if (!channelId) {
				return args.next(Boom.badData('On admin patch request for an identity object, a payload.channel or payload.id is required'));
			}
		}
		args.channelId = channelId;
		return this.fetchChannel(args);
	}

	postFetchChannel(args) {
		let channelId = (args.req.identity.channel || {}).id;

		if (!channelId && (args.req.identity.audience || []).indexOf('admin') >= 0) {
			channelId = args.req.body.channel;

			if (!channelId) {
				return args.next(Boom.badData('On admin post request, payload.channel is required'));
			}
		}
		args.channelId = channelId;
		return this.fetchChannel(args);
	}

	deleteFetchChannel() {

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

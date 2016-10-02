'use strict';

const _ = require('lodash');
const Boom = require('boom');

exports.create = function createController(controller) {
	return function requestHandler(req, res, next) {
		const method = req.method.toLowerCase();
		const handler = controller[method];

		if (_.isFunction(handler)) {
			handler.call(controller, req, res, next); /* eslint-disable-line prefer-reflect */
		} else {
			next(Boom.methodNotAllowed());
		}
	};
};

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

	getFetchChannel() {

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

	postGetChannel() {

	}

	deleteFetchChanel() {

	}

	static createController(controller) {
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

'use strict';

const _ = require('lodash');
const Boom = require('boom');

exports.create = function createController(controller) {
	return function requestHandler(req, res, next) {
		const method = req.method.toLowerCase();
		const handler = controller[method];

		if (_.isFunction(handler)) {
			handler.call(controller, req, res, next);
		} else {
			next(Boom.methodNotAllowed());
		}
	};
};

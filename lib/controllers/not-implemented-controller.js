'use strict';

const Boom = require('boom');

const controller = require('./controller');

class NotImplementedController {
	constructor(spec) {
		spec.methods.forEach(method => {
			const capMethod = method.toUpperCase();
			method = method.toLowerCase();

			this[method] = NotImplementedController.createHandler(capMethod);
		});
	}

	static createHandler(method) {
		const requestHandler = (req, res, next) => {
			const message = `${method} ${req.url} is not implemented`;
			next(Boom.notImplemented(message));
		};

		return requestHandler;
	}

	static create(spec) {
		if (!Array.isArray(spec.methods)) {
			throw new Error('NotImplementedController spec.methods is required');
		}

		return controller.create(new NotImplementedController(spec));
	}
}

module.exports = NotImplementedController;

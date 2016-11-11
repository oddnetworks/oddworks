'use strict';

const debug = require('debug')('oddworks:middleware:verify');
const _ = require('lodash');
const superagent = require('superagent'); // eslint-disable-line no-unused-vars
const Promise = require('bluebird');
const Boom = require('boom');

function yes() {
	return Promise.resolve(true);
}

function no(message) {
	return function () {
		return Promise.reject(Boom.unauthorized(message));
	};
}

module.exports = function (options) {
	options = options || {};

	const bus = options.bus;

	if (!bus || !_.isObject(bus)) {
		throw new Error('options.bus is required.');
	}

	const requestVerify = (req, res, next) => {
		const channel = req.identity.channel;
		const viewer = req.identity.viewer;

		if (viewer) {
			let verifyEvaluator = yes;
			try {
				debug('using evaluator from `channel.features.authentication.evaluators.verify`');

				verifyEvaluator = eval(`(${channel.features.authentication.evaluators.verify})`); // eslint-disable-line no-eval
			} catch (err) {
				debug('verify-evaluator-eval-error: %s', err.message);
				debug('verify-evaluator-eval-error: defaulting to false');
				bus.broadcast(
					{level: 'warn', event: 'verify-evaluator-eval-error'},
					{message: err.message, error: err}
				);

				verifyEvaluator = no(err.message);
			}

			// Run the evaluator and pass or fail it
			verifyEvaluator(bus, req, res)
				.then(() => {
					return next();
				})
				.catch(err => {
					if (err.status) {
						return next(Boom.create(err.status));
					}

					return next(err);
				});
		} else {
			debug('requesting without a viewer JWT, skipping');
			return next();
		}
	};

	return requestVerify;
};

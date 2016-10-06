'use strict';

const debug = require('debug')('oddworks:middleware:entitlements');
const _ = require('lodash');

function yes() {
	return true;
}

function no() {
	return false;
}

module.exports = function (options) {
	options = options || {};

	const bus = options.bus;

	if (!bus || !_.isObject(bus)) {
		throw new Error('options.bus is required.');
	}

	return function responseEntitlements(req, res, next) {
		const channel = req.identity.channel;

		// Default the evaluator to return true
		let entitledEvaluator = yes;

		// If auth is enabled then reset the evaluator to the one set on the channel
		if (channel.features.authentication.enabled) {
			try {
				debug('using evaluator from `channel.features.authentication.evaluator`');

				entitledEvaluator = eval(`(${channel.features.authentication.evaluator})`); // eslint-disable-line no-eval
			} catch (err) {
				debug('entitlement-evaluator-eval-error: %s', err.message);
				debug('entitlement-evaluator-eval-error: defaulting to entitled:false for all resources');
				bus.broadcast(
					{level: 'warn', event: 'entitlement-evaluator-eval-error'},
					{message: err.message, error: err}
				);

				entitledEvaluator = no;
			}
		}

		try {
			decorateEntitlements(entitledEvaluator, req, res);
		} catch (err) {
			debug('entitlement-evaluator-execution-error: %s', err.message);
			debug('entitlement-evaluator-execution-error: defaulting to entitled:false for all resources');
			bus.broadcast(
				{level: 'warn', event: 'entitlement-evaluator-execution-error'},
				{message: err.message, error: err}
			);

			entitledEvaluator = no;
			decorateEntitlements(entitledEvaluator, req, res);
		}

		next();
	};
};

function decorateEntitlements(entitledEvaluator, req, res) {
	if (Array.isArray(res.body.data)) {
		// Map over data response and decorate each resource
		res.body.data = res.body.data.map(resource => {
			resource.meta.entitled = entitledEvaluator(req.identity.viewer, resource);
			return resource;
		});
	} else {
		// Decorate the single resource
		res.body.data.meta.entitled = entitledEvaluator(req.identity.viewer, res.body.data);

		// If there is included then decorate each of those as well
		if (Array.isArray(res.body.included)) {
			res.body.included = res.body.included.map(resource => {
				resource.meta.entitled = entitledEvaluator(req.identity.viewer, resource);
				return resource;
			});
		}
	}
}

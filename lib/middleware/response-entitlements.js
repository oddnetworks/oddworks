'use strict';

const debug = require('debug')('oddworks:middleware:entitlements');
const _ = require('lodash');

module.exports = function (options) {
	options = options || {};

	const bus = options.bus;
	const types = options.types || ['video', 'collection'];

	if (!bus || !_.isObject(bus)) {
		throw new Error('options.bus is required.');
	}

	function yes() {
		return true;
	}

	function no() {
		return false;
	}

	function decorateEntitlements(entitledEvaluator, req, res) {
		if (Array.isArray(res.body.data)) {
			// Map over data response and decorate each resource
			res.body.data = res.body.data.map(resource => {
				if (_.includes(types, resource.type)) {
					_.set(resource, 'meta.entitled', entitledEvaluator(req.identity.viewer, resource));
				}
				return resource;
			});
		} else {
			// Decorate the single resource
			if (_.includes(types, res.body.data.type)) {
				_.set(res, 'body.data.meta.entitled', entitledEvaluator(req.identity.viewer, res.body.data));
			}

			// If there is included then decorate each of those as well
			if (Array.isArray(res.body.included)) {
				res.body.included = res.body.included.map(resource => {
					if (_.includes(types, resource.type)) {
						_.set(resource, 'meta.entitled', entitledEvaluator(req.identity.viewer, resource));
					}
					return resource;
				});
			}
		}
	}

	const responseEntitlements = (req, res, next) => {
		const channel = req.identity.channel;

		// Decorate non-relationship routes
		if (!/\/relationships\//.test(req.url.toLowerCase())) {
			// Default the evaluator to return true
			let entitledEvaluator = yes;

			// If auth is enabled then reset the evaluator to the one set on the channel
			if (_.get(channel, 'features.authentication.enabled', false)) {
				// If an entitlement evaluator is set on the channel then try to run it
				if (_.get(channel, 'channel.features.authentication.evaluators.entitlements')) {
					try {
						debug('using evaluator from `channel.features.authentication.evaluators.entitlements`');

						entitledEvaluator = eval(`(${channel.features.authentication.evaluators.entitlements})`); // eslint-disable-line no-eval
					} catch (err) {
						debug('entitlement-evaluator-eval-error: %s', err.message);
						debug('entitlement-evaluator-eval-error: defaulting to entitled:false for all resources');
						bus.broadcast(
							{level: 'warn', event: 'entitlement-evaluator-eval-error'},
							{message: err.message, error: err}
						);

						entitledEvaluator = no;
					}
				} else {
					entitledEvaluator = yes;
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
		}

		next();
	};

	return responseEntitlements;
};

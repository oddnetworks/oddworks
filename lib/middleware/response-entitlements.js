'use strict';

function yes() {
	return true;
}

module.exports = function () {
	return function responseEntitlements(req, res, next) {
		const channel = req.identity.channel;
		const viewer = req.identity.viewer;

		// Default the evaluator to return true
		let entitledEvaluator = yes;

		// If auth is enabled then reset the evaluator to the one set on the channel
		if (channel.features.authentication.enabled) {
			entitledEvaluator = eval(`(${channel.features.authentication.evaluator})`); // eslint-disable-line no-eval
		}

		if (Array.isArray(res.body.data)) {
			// Map over data response and decorate each resource
			res.body.data = res.body.data.map(resource => {
				resource.meta.entitled = entitledEvaluator(viewer, resource);
				return resource;
			});
		} else {
			// Decorate the single resource
			res.body.data.meta.entitled = entitledEvaluator(viewer, res.body.data);

			// If there is included then decorate each of those as well
			if (Array.isArray(res.body.included)) {
				res.body.included = res.body.included.map(resource => {
					resource.meta.entitled = entitledEvaluator(viewer, resource);
					return resource;
				});
			}
		}

		next();
	};
};

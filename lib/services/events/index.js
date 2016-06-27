'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	const service = {
		name: 'events',
		bus,
		options: options || Object.create(null),
		router: exports.router
	};

	const analyzers = service.options.analyzers || [];

	bus.observe({role: 'events'}, payload => {
		analyzers.forEach(analyzer => {
			if (_.isFunction(analyzer.send)) {
				analyzer.send(payload);
			}
		});
	});

	service.router = function (options) {
		options = _.defaults({}, options, {
			message: 'Event Logged'
		});

		const router = options.router || express.Router(); // eslint-disable-line

		router.post(`/events`, (req, res, next) => {
			bus.broadcast({role: 'events'}, req.body);

			res.status(201);
			res.body = {
				message: options.message
			};

			next();
		});

		return router;
	};

	return Promise.resolve(service);
};

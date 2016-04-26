'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const providers = require('./providers');

const service = exports = module.exports = {};

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options;

	service.options.providers = _.compact(service.options.providers);

	service.bus.observe({role: 'sync'}, payload => {
		const provider = _.find(service.options.providers, {spid: payload.spid});
		provider.sync(service.bus);
	});

	_.each(service.options.providers, provider => {
		if (provider.sync) {
			// Run sync provider right away
			service.bus.broadcast({role: 'sync'}, {spid: provider.spid});

			// Set interval for sync provider
			setInterval(() => {
				service.bus.broadcast({role: 'sync'}, {spid: provider.spid});
			}, service.options.interval || (60 * 60 * 10 * 1000));
		}
	});

	return Promise.resolve(true);
};

service.providers = providers;

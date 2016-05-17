'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const logger = require('../../logger');

const providers = require('./providers');

const TEN_MINUTES = 60 * 10 * 1000;

const service = exports = module.exports = {};

service.name = 'sync';

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options;

	service.options.providers = _.compact(service.options.providers);

	service.bus.observe({role: 'sync'}, payload => {
		const provider = _.find(service.options.providers, {spid: payload.spid});
		logger.info(`running sync provider - ${_.get(provider, 'spid')}`);
		provider.sync(service.bus);
	});

	_.each(service.options.providers, provider => {
		if (provider.sync) {
			// Run sync provider right away
			service.bus.broadcast({role: 'sync'}, {spid: provider.spid});

			// Set interval for sync provider
			setInterval(() => {
				service.bus.broadcast({role: 'sync'}, {spid: provider.spid});
			}, service.options.interval || TEN_MINUTES);
		}
	});

	return Promise.resolve(true);
};

service.providers = providers;

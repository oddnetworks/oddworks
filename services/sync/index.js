'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const providers = require('./providers');

const service = exports = module.exports = {};

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options;

	service.options.providers = _.compact(service.options.providers);

	_.each(service.options.providers, provider => {
		if (provider.sync) {
			setInterval(() => provider.sync(service.bus), service.options.interval || (60 * 60 * 10 * 1000));
		}
	});

	return Promise.resolve(true);
};

service.providers = providers;

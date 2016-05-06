'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

function ServicesUtils() {
	return this;
}

function initializer(bus, config) {
	if (process.env.NODE_ENV !== 'test') {
		console.log(`Initializing service: ${config.service.name}`);
	}
	return config.service.initialize(bus, config.options);
}

ServicesUtils.prototype = {
	load(bus, serviceConfigurations) {
		return Promise.all(_.map(serviceConfigurations, config => initializer(bus, config)));
	}
};

module.exports = exports = new ServicesUtils();

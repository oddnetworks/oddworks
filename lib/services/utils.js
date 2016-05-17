'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const logger = require('../logger');

function ServicesUtils() {
	return this;
}

function initializer(bus, config) {
	logger.info(`Initializing service: ${config.service.name}`);
	return config.service.initialize(bus, config.options);
}

Object.assign(ServicesUtils.prototype, {
	load(bus, serviceConfigurations) {
		return Promise.all(_.map(serviceConfigurations, config => initializer(bus, config)));
	}
});

module.exports = exports = new ServicesUtils();

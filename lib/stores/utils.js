'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

function StoresUtils() {
	return this;
}

function initializer(bus, config) {
	if (process.env.NODE_ENV !== 'test') {
		console.log(`Initializing store: ${config.store.name}`);
	}
	return config.store.initialize(bus, config.options);
}

StoresUtils.prototype = {
	load(bus, storeConfigurations) {
		return Promise.all(_.map(storeConfigurations, config => initializer(bus, config)));
	}
};

module.exports = exports = new StoresUtils();

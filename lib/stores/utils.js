'use strict';

const Promise = require('bluebird');
const _ = require('lodash');

function StoresUtils() {
	return this;
}

function initializer(bus, config) {
	return config.store.initialize(bus, config.options);
}

Object.assign(StoresUtils.prototype, {
	load(bus, storeConfigurations) {
		return Promise.all(_.map(storeConfigurations, config => initializer(bus, config)));
	}
});

module.exports = exports = new StoresUtils();

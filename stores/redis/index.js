'use strict';

const Promise = require('bluebird');

const store = exports = module.exports = {};

store.initialize = (bus, options) => {
	this.bus = bus;
	this.options = options;

	if (this.options.types) {
		this.options.types.forEach(type => {
			bus.queryHandler({role: 'store', cmd: 'get', type: type}, payload => {
				return Promise.resolve(payload);
			});
		});
	}
};

'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const providers = require('./providers');

const service = exports = module.exports = {};

service.initialize = (bus, options) => {
	service.bus = bus;
	service.options = options;

	service.options.providers = _.compact(service.options.providers);

	return Promise.resolve(true);
};

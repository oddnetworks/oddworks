'use strict';

exports.stores = require('./stores/');
exports.services = require('./services/');
exports.middleware = require('./middleware/');

exports.controllers = {
	Controller: require('./controller'),
	NotImplementedController: require('./not-implemented-controller')
};

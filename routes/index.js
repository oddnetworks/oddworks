// Create the router
/*eslint-disable */
var formatter = require('../lib/response-formatter');
var configController = require('./config-controller');
var deviceController = require('./device-controller');
var deviceAuthController = require('./device-auth-controller');
var eventsController = require('./events-controller');
var statusController = require('./status-controller');
var userAuth = require('./../middleware/request-user-auth');
var userEntitlement = require('./../middleware/request-user-entitlement');
var tokenScopeAuth = require('./../middleware/token-scope-auth');
var express     = require('express');
var boom = require('boom');

module.exports = function decorateServiceWithRoutes(app) {
	app.enable('case sensitive routing');
	var router = express.Router({
		caseSensitive: app.get('case sensitive routing')
	});
	/*eslint-enable */

	/*
		**************************************
		//              Routes                //
		**************************************
	*/

	// v1 Routes for devices
	router.get('/:version(v1|v2)/config\.:ext?', configController.get);
	router.post('/:version(v1|v2)/events\.:ext?', eventsController.post);
	router.get('/:version(v1|v2)/search\.:ext?', userAuth, userEntitlement, deviceController.search);
	router.get('/:version(v1|v2)/status\.:ext?', statusController.get);
	router.post('/:version(v1|v2)/auth/device/code\.:ext?', deviceAuthController.code);
	router.post('/:version(v1|v2)/auth/user/authorize\.:ext?', tokenScopeAuth('devicelink'), deviceAuthController.authorize);
	router.post('/:version(v1|v2)/auth/device/token\.:ext?', deviceAuthController.token);
	router.get('/:version(v1|v2)/auth/user/:clientUserID/devices\.:ext?', tokenScopeAuth('devicelink'), deviceAuthController.listUserDevices);
	router.delete('/:version(v1|v2)/auth/user/:clientUserID/devices/:deviceUserProfileID\.:ext?', tokenScopeAuth('devicelink'), deviceAuthController.removeUserDevice);

	// JSONAPI states this is the way to grab only the relationship's resource identifiers
	router.get('/:version(v1|v2)/:entityType(collections|videoCollections|views)/:entityId/relationships/:relationship\.:ext?', userAuth, userEntitlement, deviceController.related);

	// JSONAPI states this is the way to grab the relationship's full entities
	router.get('/:version(v1|v2)/:entityType(collections|videoCollections|views)/:entityId/:relationship\.:ext?', userAuth, userEntitlement, deviceController.related);

	router.get('/:version(v1|v2)/:entityType(articles|events|externals|liveStreams|videos|collections|videoCollections|promotions|queries|views)\.:ext?', userAuth, userEntitlement, deviceController.index);
	router.get('/:version(v1|v2)/:entityType(articles|events|externals|liveStreams|videos|collections|videoCollections|promotions|queries|views)/:entityId\.:ext?', userAuth, userEntitlement, deviceController.get);

	app.use(router);

	return app;
};

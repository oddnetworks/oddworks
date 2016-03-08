'use strict';

var deviceAuth = require('../lib/device-auth');
var send = require('../lib/response-send');

module.exports = {
	code: function code(req, res, next) {
		deviceAuth.issueUserCode(req, res, next, send);
	},

	authorize: function authorize(req, res, next) {
		deviceAuth.authorizeUser(req, res, next, send);
	},

	token: function token(req, res, next) {
		deviceAuth.issueAccessToken(req, res, next, send);
	},

	listUserDevices: function listUserDevices(req, res, next) {
		deviceAuth.listUserDevices(req, res, next, send);
	},

	removeUserDevice: function removeUserDevice(req, res, next) {
		deviceAuth.removeUserDevice(req, res, next, send);
	}
};

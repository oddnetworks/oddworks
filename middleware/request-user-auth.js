'use strict';

var _ = require('lodash');
var boom = require('boom');
var Promise = require('bluebird');

module.exports = function requestUserAuth(req, res, next) {
	var seneca = req.app.get('seneca');
	var act = Promise.promisify(seneca.act, seneca);

	if (req.authorizationToken) {
		if (_.includes(req.authorizationToken.scope, 'user')) {
			req.identity.user = {};
			act({role: 'device-auth', cmd: 'fetchDeviceUserProfile', jti: req.authorizationToken.jti})
				.then(function (deviceUserProfile) {
					req.identity.user.deviceUserProfile = deviceUserProfile;
					next();
				})
			.catch(function () {
				next(boom.unauthorized('Invalid User Authorization Token'));
			});
		} else {
			next(boom.unauthorized('Invalid User Authorization Scope'));
		}
	} else {
		next();
	}
};

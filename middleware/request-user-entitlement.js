'use strict';

var boom = require('boom');
var Promise = require('bluebird');

module.exports = function requestUserEntitlement(req, res, next) {
	var seneca = req.app.get('seneca');
	var act = Promise.promisify(seneca.act, seneca);

	if (req.identity.user) {
		var organizationID = req.identity.user.deviceUserProfile.organizationID;
		var entitlementCredentials = req.identity.user.deviceUserProfile.entitlementCredentials;

		act({role: 'entitlement', cmd: 'verify', organizationID: organizationID, entitlementCredentials: entitlementCredentials})
			.then(function (userEntitlements) {
				if (userEntitlements.length === 0) {
					next(boom.unauthorized('Empty user entitlements.'));
				} else {
					req.identity.user.userEntitlements = userEntitlements;
					next();
				}
			})
			.catch(function (err) {
				next(boom.unauthorized('Could not verify user entitlements. ' + err.message));
			});
	} else {
		next();
	}
};

'use strict';

var boom = require('boom');
var _ = require('lodash');

function issueUserCode(req, res, next, done) {
	var seneca = req.app.get('seneca');
	var organizationID = req.identity.organization.id;
	var deviceType = req.identity.device.deviceType;

	seneca.act({role: 'device-auth', cmd: 'issueUserCode', organizationID: organizationID, deviceType: deviceType}, function (err, codeResponse) {
		if (err) {
			switch (err.name) {
				case 'CacheError':
					return next(boom.badImplementation(err.message));
				default:
					return next(boom.wrap(err));
			}
		}
		req.data = codeResponse;
		done(null, req, res, next);
	});
}

function authorizeUser(req, res, next, done) {
	var seneca = req.app.get('seneca');
	var organizationID = req.identity.organization.id;
	var entitlementCredentials = req.body.attributes.entitlement_credentials;
	var userCode = req.body.attributes.user_code;

	seneca.act({role: 'device-auth', cmd: 'authorizeUser', organizationID: organizationID, entitlementCredentials: entitlementCredentials, userCode: userCode}, function (err, authorizeResponse) {
		if (err) {
			switch (err.name) {
				case 'CacheError':
					return next(boom.badImplementation(err.message));
				case 'DatabaseError':
					return next(boom.badImplementation(err.message));
				case 'DeviceCodeError':
					return next(boom.notFound(err.message));
				default:
					return next(boom.wrap(err));
			}
		}
		req.data = authorizeResponse;
		done(null, req, res, next);
	});
}

function issueAccessToken(req, res, next, done) {
	var seneca = req.app.get('seneca');
	var organizationID = req.identity.organization.id;
	var deviceType = req.identity.device.deviceType;
	var deviceCode = req.body.attributes.device_code;

	seneca.act({role: 'device-auth', cmd: 'issueAccessToken', organizationID: organizationID, deviceType: deviceType, deviceCode: deviceCode}, function (err, tokenResponse) {
		if (err) {
			switch (err.name) {
				case 'CacheError':
					return next(boom.badImplementation(err.message));
				case 'ClientUserInfoError':
					return next(boom.notFound(err.message));
				case 'DatabaseError':
					return next(boom.badImplementation(err.message));
				case 'DeviceUserProfileError':
					return next(boom.notFound(err.message));
				case 'OrgDeviceTypeMismatchError':
					return next(boom.badRequest(err.message));
				default:
					return next(boom.wrap(err));
			}
		}

		// TODO: add only the accesstoken and tokentype to req.data (when vars are modified to not include _s).
		req.data = {deviceUserProfile: _.get(tokenResponse, 'data$') ? tokenResponse.data$(false) : tokenResponse};
		delete req.data.deviceUserProfile.access_token;
		delete req.data.deviceUserProfile.token_type;
		/* eslint-disable */
		req.data.access_token = tokenResponse.access_token;
		req.data.token_type = tokenResponse.token_type;
		/* eslint-enable */
		done(null, req, res, next);
	});
}

function listUserDevices(req, res, next, done) {
	var seneca = req.app.get('seneca');
	var organizationID = req.identity.organization.id;
	var clientUserID = req.params.clientUserID;

	seneca.act({role: 'device-auth', cmd: 'listUserDevices', organizationID: organizationID, clientUserID: clientUserID}, function (err, userDevices) {
		if (err) {
			switch (err.name) {
				case 'DatabaseError':
					return next(boom.badImplementation(err.message));
				case 'DeviceUserProfileError':
					return next(boom.notFound(err.message));
				default:
					return next(boom.wrap(err));
			}
		}
		req.data = userDevices;
		done(null, req, res, next);
	});
}

function removeUserDevice(req, res, next, done) {
	var seneca = req.app.get('seneca');
	var organizationID = req.identity.organization.id;
	var clientUserID = req.params.clientUserID;
	var deviceUserProfileID = req.params.deviceUserProfileID;

	seneca.act({role: 'device-auth', cmd: 'removeUserDevice', organizationID: organizationID, clientUserID: clientUserID, deviceUserProfileID: deviceUserProfileID}, function (err, tokenResponse) {
		if (err) {
			switch (err.name) {
				case 'DatabaseError':
					return next(boom.badImplementation(err.message));
				case 'DeviceUserProfileError':
					return next(boom.notFound(err.message));
				default:
					return next(boom.wrap(err));
			}
		}
		req.data = tokenResponse;
		done(null, req, res, next);
	});
}

module.exports = {
	issueUserCode: issueUserCode,
	authorizeUser: authorizeUser,
	issueAccessToken: issueAccessToken,
	listUserDevices: listUserDevices,
	removeUserDevice: removeUserDevice
};

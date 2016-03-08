'use strict';

var Jwt = require('jsonwebtoken');
var boom = require('boom');

var accessTokenSharedSecret = require('../config').secrets.accessTokenSharedSecret;

function decodeJWT(accessToken, cb) {
	Jwt.verify(accessToken, accessTokenSharedSecret, function (err, decodedJWT) {
		if (err) {
			cb('Invalid Access Token', null);
		} else {
			cb(null, decodedJWT);
		}
	});
}

module.exports = function requestAccessTokenDecode(req, res, next) {
	var accessToken = req.get('x-access-token');
	var authorizationToken = req.headers.authorization ? req.headers.authorization.split('Bearer ')[1] : undefined;

	decodeJWT(accessToken, function (err, decodedAccessToken) {
		if (err) {
			next(boom.badRequest(err));
		} else {
			req.accessToken = decodedAccessToken;

			if (authorizationToken) {
				decodeJWT(authorizationToken, function (err, decodedAuthorizationToken) {
					if (err) {
						next(boom.badRequest(err));
					} else {
						req.authorizationToken = decodedAuthorizationToken;

						if (req.accessToken.deviceID === req.authorizationToken.deviceID) {
							next();
						} else {
							next(boom.badRequest('DeviceID accessToken/authorizationToken mismatch'));
						}
					}
				});
			} else {
				next();
			}
		}
	});
};

'use strict';
const crypto = require('crypto');

module.exports = function requestSession(req, res, next) {
	// Session ID - Fingerprint currently calculated from access token and IP (a better algorithm would be nice!) @BJC
	// Maybe going forward we should have the platform generate it?
	const accessToken = req.get('x-access-token');
	req.sessionId = crypto.createHash('md5').update(req.ip + accessToken).digest('hex');

	next();
};

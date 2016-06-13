'use strict';

const path = require('path');
const boom = require('boom');

module.exports = function requestContentType(req, res, next) {
	const extension = path.extname(req.path);
	const acceptHeader = req.get('Accept');

	if ((acceptHeader === 'application/xml' && (extension === '' || extension === '.xml')) ||
			(acceptHeader === '*/*' && extension === '.xml') ||
			// Xbox 360 is an asshole and doesn't even send an Accept header
			(!acceptHeader && extension === '.xml')) {
		req.responseType = 'xml';
		res.set('Content-Type', 'application/xml');
	} else if ((acceptHeader === 'application/json' && (extension === '' || extension === '.json')) || (acceptHeader === '*/*' && extension === '.json')) {
		req.responseType = 'json';
	} else {
		return next(boom.notAcceptable());
	}

	next();
};

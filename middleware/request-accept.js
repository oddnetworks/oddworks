'use strict';

var path = require('path');
var boom = require('boom');

module.exports = function requestContentType(req, res, next) {
	var extension = path.extname(req.path);
	var acceptHeader = req.get('Accept');

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

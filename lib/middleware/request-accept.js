'use strict';

const path = require('path');
const Boom = require('boom');

module.exports = function requestAccept(req, res, next) {
	const ext = path.extname(req.path);

	if (ext === '.xml' || req.accepts('xml')) {
		req.responseType = 'xml';
	} else if (ext === '.json' || req.accepts('json')) {
		req.responseType = 'json';
	} else {
		return next(Boom.notAcceptable());
	}

	next();
};

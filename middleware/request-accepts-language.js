'use strict';

var _ = require('lodash');

module.exports = function requestContentType(req, res, next) {
	req.query.locale = req.query.locale || req.acceptsLanguages() || 'en-us';
	req.query.locale = _.kebabCase(req.query.locale.toLowerCase());
	next();
};

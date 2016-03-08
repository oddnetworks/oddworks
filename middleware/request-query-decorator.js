'use strict';

module.exports = function requestQueryDecorator(req, res, next) {
	var includes = [];

	if (req.query.include) {
		includes = req.query.include.split(',');
		req.query.include = includes;
	}

	next();
};

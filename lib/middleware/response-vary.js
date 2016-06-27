'use strict';

module.exports = function () {
	return function responseVary(req, res, next) {
		res.vary('x-access-token');
		res.vary('Authorization');
		res.vary('Accept');
		res.vary('X-Geo-Country-Code');

		next();
	};
};

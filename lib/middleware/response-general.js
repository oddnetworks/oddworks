'use strict';

module.exports = function () {
	return function responseGeneral(req, res, next) {
		// Set geocountry (header comes from Fastly
		res.set('X-Geo-Country-Code', (req.get('X-Geo-Country-Code') || 'US').toUpperCase());

		// Clean up express junk
		res.removeHeader('Server');
		res.removeHeader('Via');

		next();
	};
};

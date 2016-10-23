'use strict';

module.exports = function () {
	const responseGeneral = (req, res, next) => {
		// Set geocountry (header comes from Fastly
		res.set('X-Geo-Country-Code', (req.get('X-Geo-Country-Code') || 'US').toUpperCase());

		// Clean up express junk
		res.removeHeader('Server');
		res.removeHeader('Via');

		next();
	};

	return responseGeneral;
};

'use strict';

module.exports = function responseHeaders(req, res, next) {
	// CORS
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.set('Access-Control-Allow-Headers', 'Origin, X-Access-Token, X-Requested-With, Content-Type, Accept, Cache-Control');
	res.set('Access-Control-Max-Age', '600');

	/* Caching
			max-age: cache for 10 minutes
			stale-while-revalidate: cache for a week while revalidaing new data (for fastly)
			stale-if-error: cache for a week if API responds with any error (for fastly)
	*/
	res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=604800, stale-if-error=604800');

	// Set geocountry (header comes from Fastly!)
	res.set('X-Geo-Country-Code', (req.get('X-Geo-Country-Code') || 'US').toUpperCase());

	// Clean up express junk
	res.removeHeader('Server');
	res.removeHeader('Via');

	next();
};

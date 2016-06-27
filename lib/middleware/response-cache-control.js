'use strict';

module.exports = function (options) {
	options = options || {};

	const header = [
		'public',
		`max-age=${options.maxAge || 600}`,
		`stale-while-revalidate=${options.staleWhileRevalidate || 604800}`,
		`stale-if-error=${options.staleIfError || 604800}`
	].join(', ');

	return function responseCacheControl(req, res, next) {
		res.set('Cache-Control', header);
		next();
	};
};

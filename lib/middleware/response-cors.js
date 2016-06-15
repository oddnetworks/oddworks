'use strict';

module.exports = function (options) {
	options = options || {};

	const methods = (options.methods || ['get', 'put', 'post', 'delete', 'options'])
		.map(method => {
			return method.toUpperCase();
		})
		.join(',');

	let headers = options.headers || [
		'Origin',
		'X-Access-Token',
		'X-Requested-With',
		'Content-Type',
		'Accept',
		'Cache-Control'
	];

	headers = headers.join(', ');

	const maxAge = (options.maxAge || 600).toString();

	return function responseCors(req, res, next) {
		res.set('Access-Control-Allow-Origin', '*');
		res.set('Access-Control-Allow-Methods', methods);
		res.set('Access-Control-Allow-Headers', headers);
		res.set('Access-Control-Max-Age', maxAge);

		next();
	};
};

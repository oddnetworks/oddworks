var _ = require('lodash');
var boom = require('boom');

module.exports = function (scope) {
	return function (req, res, next) {
		var tokenScope = _.get(req, 'accessToken.scope');
		if (_.includes(tokenScope, scope)) {
			next();
		} else {
			next(boom.unauthorized('Invalid Access Token Scope'));
		}
	};
};

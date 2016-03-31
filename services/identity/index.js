const boom = require('boom');

const service = exports = module.exports = {};

service.initialize = (bus, options) => {
	this.bus = bus;
	this.options = options || {};
};

service.middleware = (options) => {
	return (req, res, next) => {
		if (req.get(options.header)) {
			next();
		} else {
			next(boom.unauthorized());
		}
	};
};

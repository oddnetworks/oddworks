'use strict';

const winston = require('winston');

exports = module.exports = new (winston.Logger)({
	level: 'info',
	transports: [
		new (winston.transports.Console)()
	]
});

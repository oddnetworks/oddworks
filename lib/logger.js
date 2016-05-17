'use strict';

require('date-format-lite');
const UTC_OFFSET = 0;
const winston = require('winston');
const logger = new (winston.Logger)({
	transports: [
		new winston.transports.Console({
			level: 'info',
			colorize: true,
			timestamp() {
				return new Date().format('YYYY-MM-DDThh:mm:ss.SSSZ', UTC_OFFSET);
			},
			handleExceptions: true,
		})
	]
});

module.exports = logger;

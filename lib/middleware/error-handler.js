'use strict';

const _ = require('lodash');

const DEFAULT_TITLE = 'Internal Server Error';

// options.handler - Function
module.exports = function (options) {
	options = options || {};
	const handler = options.handler;

	function shouldReportError(err) {
		if (_.isFunction(handler)) {
			if (err && err.output && err.output.statusCode < 500) {
				return false;
			}
			return true;
		}
		return false;
	}

	function formatError(error) {
		const output = error.output || {};
		return {
			status: output.statusCode ? output.statusCode.toString() : '500',
			title: output.payload ? output.payload.error : (error.name || DEFAULT_TITLE),
			detail: output.payload ? output.payload.message : error.message
		};
	}

	return function errorHandler(errors, req, res, next) {
		if (errors) {
			errors = Array.isArray(errors) ? errors : [errors];

			// We treat Boom errors specially
			// https://github.com/hapijs/boom

			errors.forEach(err => {
				if (shouldReportError(err)) {
					handler(err, req);
				}
			});

			const err = errors[0];

			res
				.status(err.isBoom ? err.output.statusCode : 500)
				.send({
					errors: errors.map(formatError)
				});
		} else {
			next();
		}
	};
};

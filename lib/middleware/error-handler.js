'use strict';

const _ = require('lodash');

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
			status: output.statusCode ? output.statusCode.toString() : null,
			title: error.name,
			detail: error.message
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

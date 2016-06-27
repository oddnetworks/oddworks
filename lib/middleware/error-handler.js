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

	return function errorHandler(err, req, res, next) {
		if (err) {
			// We treat Boom errors specially
			// https://github.com/hapijs/boom

			if (shouldReportError(err)) {
				handler(err, req);
			}

			res
				.status(err.isBoom ? err.output.statusCode : 500)
				.send({error: formatError(err)});
		} else {
			next();
		}
	};
};

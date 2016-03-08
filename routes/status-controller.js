'use strict';

var send = require('../lib/response-send.js');

module.exports = {
	get: function (req, res, next) {
		req.data = {
			id: 'status_',
			type: 'status',
			message: 'alive'
		};

		return send(null, req, res, next);
	}
};

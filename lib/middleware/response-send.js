'use strict';

module.exports = function () {
	return function responseSend(req, res) {
		res.send(res.body);
	};
};

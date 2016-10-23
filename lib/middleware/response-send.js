'use strict';

module.exports = function () {
	const responseSend = (req, res) => {
		res.send(res.body);
	};

	return responseSend;
};


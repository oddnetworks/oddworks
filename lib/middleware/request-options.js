'use strict';

module.exports = function () {
	const requestOptions = (req, res, next) => {
		if (req.method === 'OPTIONS') {
			res.sendStatus(200);
			req.connection.destroy();
		} else {
			next();
		}
	};

	return requestOptions;
};

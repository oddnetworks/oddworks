'use strict';

var xmlSerializer = require('./xml-serializer');

module.exports = function (res) {
	res.format({
		xml: function () {
			res.body = xmlSerializer.render(res.body);
			res.send(res.body);
		},
		json: function () {
			res.send(res.body);
		},
		default: function () {
			// log the request and respond with 406
			res.status(406).send('Not Acceptable');
		}
	});
};

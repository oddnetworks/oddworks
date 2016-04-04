'use strict';

var headerParser = require('header-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var realIp = require('express-real-ip');

module.exports = () => {
	return [
		realIp(),
		headerParser,
		bodyParser.urlencoded({extended: true}),
		bodyParser.json(),
		require('./response-headers'),
		require('./request-options'),
		require('./response-vary'),
		require('./request-accept'),
		require('./request-session'),
		compression()
	];
};

'use strict';

const headerParser = require('header-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const realIp = require('express-real-ip');

/* eslint-disable */
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
/* eslint-enable */

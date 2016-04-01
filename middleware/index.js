'use strict';

var headerParser = require('header-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var realIp = require('express-real-ip');

module.exports = function (app) {
	app.disable('x-powered-by');
	app.set('trust proxy', 'loopback, linklocal, uniquelocal');

	app.use(realIp());

	app.use(headerParser);
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());

	app.use(require('./response-headers'));
	app.use(require('./request-options'));
	app.use(require('./response-vary'));
	app.use(require('./request-accept'));
	app.use(require('./request-session'));

	app.use(compression());
};

'use strict';

var _ = require('lodash');
var headerParser = require('header-parser');
var bodyParser = require('body-parser');
var compression = require('compression');
var realIp = require('express-real-ip');
var morgan = require('morgan');

morgan.token('organization', function (req) {
	return _.get(req, 'identity.organization.id', '').toUpperCase();
});

morgan.token('device', function (req) {
	return _.get(req, 'identity.device.deviceType', '').toUpperCase();
});

morgan.token('x-odd-user-agent', function (req) {
	return req.get('x-odd-user-agent');
});

module.exports = function (app) {
	app.disable('x-powered-by');
	app.set('trust proxy', 'loopback, linklocal, uniquelocal');

	app.use(morgan('### [:date[clf]] ":method :url HTTP/:http-version" :status ":organization :device" "Odd User Agent: :x-odd-user-agent" "User Agent: :user-agent"'));
	app.use(realIp());

	app.use(headerParser);
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(bodyParser.json());

	app.use(require('./response-headers'));
	app.use(require('./request-options'));
	app.use(require('./request-access-token-decode'));
	app.use(require('./response-vary'));
	app.use(require('./request-device-org-auth'));
	app.use(require('./request-query-decorator'));
	app.use(require('./request-content-type'));
	app.use(require('./request-session'));

	app.use(compression());

	return app;
};

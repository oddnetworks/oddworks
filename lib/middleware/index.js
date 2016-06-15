'use strict';

const _ = require('lodash');
const bodyParser = require('body-parser');
const headerParser = require('header-parser');

const MIDDLEWARE = {
	'header-parser'() {
		return headerParser;
	},
	'body-parser-json'(options) {
		return bodyParser.json(options);
	},
	'body-parser-url-encoded'(options) {
		return bodyParser.urlencoded(options);
	},
	'compression': require('compression'),
	'express-real-ip': require('express-real-ip'),
	'request-accept': require('./request-accept'),
	'request-options': require('./request-options'),
	'response-cache-control': require('./response-cache-control'),
	'response-cors': require('./response-cors'),
	'response-general': require('./response-general'),
	'response-vary': require('./response-vary')
};

const DEFAULTS = {
	'header-parser': {},
	'body-parser-json': {},
	'body-parser-url-encoded': {extended: true},
	'compression': {},
	'express-real-ip': {},
	'request-accept': {},
	'request-options': {},
	'response-cache-control': {},
	'response-cors': {},
	'response-general': {},
	'response-vary': {}
};

module.exports = function (options) {
	options = _.defaults({}, options || {}, DEFAULTS);

	return _.compact(Object.keys(options).map(key => {
		const config = options[key];
		if (config) {
			return MIDDLEWARE[key](config);
		}
		return null;
	}));
};

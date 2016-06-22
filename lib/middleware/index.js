'use strict';

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
	'error-handler': require('./error-handler'),
	'request-accept': require('./request-accept'),
	'request-json-api': require('./request-json-api'),
	'request-options': require('./request-options'),
	'response-cache-control': require('./response-cache-control'),
	'response-cors': require('./response-cors'),
	'response-general': require('./response-general'),
	'response-json-api': require('./response-vary'),
	'response-vary': require('./response-vary')
};

Object.assign(exports, MIDDLEWARE);

exports.load = function (configs) {
	return configs.map(config => {
		if (config) {
			return MIDDLEWARE[config.middleware](config);
		}
		return null;
	});
};

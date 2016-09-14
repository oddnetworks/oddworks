'use strict';

const bodyParser = require('body-parser');
const headerParser = require('header-parser');

Object.assign(exports, {
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
	'request-authenticate': require('./request-authenticate'),
	'request-authorize': require('./request-authorize'),
	'request-json-api': require('./request-json-api'),
	'request-options': require('./request-options'),
	'response-cache-control': require('./response-cache-control'),
	'response-cors': require('./response-cors'),
	'response-general': require('./response-general'),
	'response-json-api': require('./response-json-api'),
	'response-send': require('./response-send'),
	'response-vary': require('./response-vary')
});

exports.load = function (configs) {
	return configs.map(config => {
		if (config) {
			return exports[config.middleware](config);
		}
		return null;
	});
};

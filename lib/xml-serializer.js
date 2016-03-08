'use strict';

var EasyXML = require('easyxml');

module.exports = new EasyXML({
	singularizeChildren: true,
	allowAttributes: true,
	rootElement: 'response',
	dateFormat: 'ISO',
	indent: 2,
	manifest: true
});

'use strict';

var url = require('url');
var fs = require('fs');
var path = require('path');

function requireDir(dir) {
	return fs.readdirSync(dir).reduce(function (modules, filename) {
		var module;
		var moduleName;

		if (filename === 'index.js' || path.extname(filename) !== '.js') {
			return modules;
		}

		moduleName = path.basename(filename, '.js');
		/* eslint-disable */
		module = require(path.join(dir, moduleName));
		/* eslint-enable */

		if (typeof module === 'function' && module.name) {
			moduleName = module.name;
		}

		modules[moduleName] = module;
		return modules;
	}, {});
}

function extend(obj) {
	Array.prototype.slice.call(arguments, 1).forEach(function (source) {
		if (!source) {
			return;
		}

		for (var key in source) {
			if (source.hasOwnProperty(key)) {
				obj[key] = source[key];
			}
		}
	});

	return obj;
}

function link(req, filePath) {
	var host = req.get('host').split(':');

	var opts = {
		protocol: req.protocol,
		hostname: host[0] || host,
		port: host[1] || null,
		pathname: filePath || req.originalUrl
	};

	return url.format(opts);
}

module.exports = {
	requireDir: requireDir,
	extend: extend,
	link: link
};

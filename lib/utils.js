'use strict';

exports.extend = function (target, source) {
	return Object.keys(source).reduce(function (target, key) {
		target[key] = source[key];
		return target;
	}, target);
};

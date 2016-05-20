'use strict';

exports.extend = (target, source) => {
	return Object.keys(source).reduce((target, key) => {
		target[key] = source[key];
		return target;
	}, target);
};

exports.notImplemented = message => {
	return () => {
		throw new Error('Not Implemented: ' + message);
	};
};

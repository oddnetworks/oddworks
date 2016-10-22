'use strict';

exports.arrayify = function (object) {
	if (Array.isArray(object)) {
		return object;
	}

	return [object];
};

'use strict';

exports.arrayify = function (object) {
	if (Array.isArray(object)) {
		return object;
	}

	return [object];
};

exports.isEqualResource = function (r1, r2) {
	return ((r1.id === r2.id) && (r1.type === r2.type));
};

exports.toResourceIdentifier = function (resource) {
	return {
		id: resource.id,
		type: resource.type
	};
};

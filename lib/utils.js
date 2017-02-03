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

exports.updateObject = function (a, b) {
	a = a || {};
	b = b || {};
	let newObject = exports.extendUpdate({}, a);
	newObject = exports.extendUpdate(newObject, b);
	return newObject;
};

exports.extendUpdate = function (a, b) {
	return Object.keys(b).reduce((a, k) => {
		const val = b[k];
		if (typeof val === 'function' || typeof val === 'undefined') {
			return a;
		} else if (!val || Array.isArray(val) || typeof val !== 'object') {
			a[k] = val;
		} else if (typeof val === 'object') {
			a[k] = exports.extendUpdate(a[k] || {}, val);
		}
		return a;
	}, a);
};

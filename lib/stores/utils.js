'use strict';

const Promise = require('bluebird');

exports.load = function (bus, configs) {
	const stores = Object.create(null);

	return configs.reduce((promise, config) => {
		return promise.then(stores => {
			return config.store(bus, config.options).then(store => {
				stores[store.name] = store;
				return stores;
			});
		});
	}, Promise.resolve(stores));
};

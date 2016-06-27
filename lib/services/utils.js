'use strict';

const Promise = require('bluebird');

exports.load = function (bus, configs) {
	const services = Object.create(null);

	return configs.reduce((promise, config) => {
		return promise.then(services => {
			return config.service(bus, config.options).then(service => {
				services[service.name] = service;
				return services;
			});
		});
	}, Promise.resolve(services));
};

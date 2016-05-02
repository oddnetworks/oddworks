'use strict';

const identityService = require('./identity');
const catalogService = require('./catalog');
const jsonAPIService = require('./json-api');

const identityOptions = {jwtSecret: process.env.JWT_SECRET || 'secret'};

function DefaultServices() {
	return [
		{
			service: identityService,
			options: identityOptions
		},
		{
			service: catalogService,
			options: {}
		},
		{
			service: jsonAPIService,
			options: {}
		}
	];
}

module.exports = DefaultServices;

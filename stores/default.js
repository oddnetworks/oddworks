'use strict';

const Promise = require('bluebird');
const chalk = require('chalk');
const redis = require('fakeredis').createClient();
const redisStore = require('./redis');
const redisSearchStore = require('./redis-search');

function DefaultStores(bus) {
	console.log(chalk.black.bgYellow.bold('\nWARNING: Use a real data store for production\n'))

	return [
		{
			service: redisStore,
			options: {redis, types: ['platform', 'channel', 'collection', 'promotion', 'video', 'view']}
		},
		{
			service: redisSearchStore,
			options: {redis, types: ['collection', 'video']}
		}
	];
}

module.exports = DefaultStores;

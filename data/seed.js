'use strict';

const path = require('path');

const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const glob = Promise.promisifyAll(require('glob')).GlobAsync;
const searchableTypes = ['collection', 'video'];
const jwt = require('jsonwebtoken');

const isDev = (process.env.NODE_ENV === 'development');

module.exports = bus => {
	return glob('./**/*.json', {cwd: __dirname})
		.then(files => {
			return _.map(files, file => {
				return require(path.join(__dirname, file)); // eslint-disable-line
			});
		})
		.then(objects => {
			if (isDev) {
				console.log('');
				console.log(chalk.blue(`Loading test data...`));
			}
			return Promise.all(
				_.map(objects, object => {
					const searchable = Boolean(_.indexOf(searchableTypes, object.type) + 1);
					let pattern = {role: 'store', cmd: 'set', type: object.type};
					if (searchable) {
						pattern = {role: 'catalog', cmd: 'create', searchable: true};
					}
					if (isDev) {
						const payload = {
							version: 1,
							channel: object.channel,
							platform: object.id,
							scope: ['platform']
						};

						const token = jwt.sign(payload, process.env.JWT_SECRET);
						console.log(chalk.blue(`${_.capitalize(object.type)}: ${object.id} ${((object.type === 'platform') ? token : '')}`));
					}
					return bus.sendCommand(pattern, object);
				})
			);
		});
};

'use strict';

const path = require('path');

const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const glob = Promise.promisifyAll(require('glob')).GlobAsync;
const searchableTypes = ['collection', 'video'];
const jwt = require('jsonwebtoken');

function loadFiles(files) {
	return _.map(files, file => {
		return require(path.join(__dirname, file)); // eslint-disable-line
	});
}

function seedData(bus, objects) {
	return _.map(objects, object => {
		const searchable = Boolean(_.indexOf(searchableTypes, object.type) + 1);
		let pattern = {role: 'store', cmd: 'set', type: object.type};
		if (searchable) {
			pattern = {role: 'catalog', cmd: 'create', searchable: true};
		}

		const payload = {
			version: 1,
			channel: object.channel,
			platform: object.id,
			scope: ['platform']
		};

		const token = jwt.sign(payload, process.env.JWT_SECRET);
		if (object.type === 'platform') {
			console.log(chalk.blue(`${_.capitalize(object.type)}: `) + chalk.cyan(object.id));
			console.log(chalk.blue('     JWT: ') + chalk.cyan(token));
			console.log('');
		} else {
			console.log(chalk.blue(`${_.capitalize(object.type)}: `) + chalk.cyan(object.id));
		}
		if (object.type === 'channel') {
			console.log('');
		}

		return bus.sendCommand(pattern, object);
	});
}

module.exports = bus => {
	return glob('./+(channel|platform)/*.json', {cwd: __dirname})
		.then(loadFiles)
		.then(objects => {
			console.log('');
			console.log(chalk.green(`Loading sample Channel and Platforms...`));
			console.log(chalk.green(`-------------------------------------`));

			return Promise.all(seedData(bus, objects));
		})
		.then(() => {
			return glob('./+(collection|promotion|video|view)/*.json', {cwd: __dirname});
		})
		.then(loadFiles)
		.then(objects => {
			console.log('');
			console.log(chalk.green(`Loading sample Resources...`));
			console.log(chalk.green(`-------------------------`));

			return Promise.all(seedData(bus, objects));
		});
};

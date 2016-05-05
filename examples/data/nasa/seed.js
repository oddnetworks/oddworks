'use strict';

const path = require('path');

const _ = require('lodash');
const Promise = require('bluebird');
const glob = Promise.promisifyAll(require('glob')).GlobAsync;
const searchableTypes = ['collection', 'video'];

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

		return bus.sendCommand(pattern, object);
	});
}

module.exports = bus => {
	return glob('./+(channel|platform)/*.json', {cwd: __dirname})
		.then(loadFiles)
		.then(objects => {
			return Promise.all(seedData(bus, objects));
		})
		.then(() => {
			return glob('./+(collection|promotion|video|view)/*.json', {cwd: __dirname});
		})
		.then(loadFiles)
		.then(objects => Promise.all(seedData(bus, objects)));
};

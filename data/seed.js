'use strict';

const path = require('path');

const _ = require('lodash');
const Promise = require('bluebird');
const glob = Promise.promisifyAll(require('glob')).GlobAsync;
const winston = require('winston');
const searchableTypes = ['collection', 'video'];

module.exports = (bus) => {
	return glob('./**/*.json', {cwd: __dirname})
		.then(files => {
			return _.map(files, file => {
				return require(path.join(__dirname, file));
			});
		})
		.then(objects => {
			return Promise.all(
				_.map(objects, object => {
					const searchable = Boolean(_.indexOf(searchableTypes, object.type) + 1);
					let pattern = {role: 'store', cmd: 'set', type: object.type};
					if (searchable) {
						pattern = {role: 'catalog', cmd: 'create', searchable: true};
					}
					winston.info(`Seeding ${object.type} ${object.id}`);
					return bus.sendCommand(pattern, object);
				})
			);
		});
};

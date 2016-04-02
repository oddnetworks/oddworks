'use strict';

const path = require('path');

const _ = require('lodash');
const Promise = require('bluebird');
const glob = Promise.promisifyAll(require('glob')).GlobAsync;
const winston = require('winston');

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
					winston.info(`Seeding ${object.type} ${object.id}`);
					return bus.query({role: 'store', cmd: 'set', type: object.type}, object);
				})
			);
		});
};

'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const boom = require('boom');
const express = require('express');

const configFile = process.env.CONFIG || './config/default';
const config = require(configFile);

const middleware = require('./middleware');

const oddcast = require('oddcast');
const bus = oddcast.bus();
const app = express();

// Initialize oddcast for events, commands, requests
bus.events.use(config.oddcast.events.options, config.oddcast.events.transport);
bus.commands.use(config.oddcast.commands.options, config.oddcast.commands.transport);
bus.requests.use(config.oddcast.requests.options, config.oddcast.requests.transport);

function initializer(obj) {
	console.log(chalk.blue.bold(`Initializing service: ${obj.service.name}`));
	return obj.service.initialize(bus, obj.options);
}

module.exports = Promise
	// Initialize stores
	.all(_.map(config.stores, initializer))
	// Initialize services
	.then(() => {
		return Promise.all(_.map(config.services, initializer));
	})
	// Seed the stores if in development mode
	.then(() => {
		if (config.seed) {
			return require(`${config.dataDir}/seed`)(bus); // eslint-disable-line
		}

		return true;
	})

	// Start configuring express
	.then(() => {
		app.disable('x-powered-by');
		app.set('trust proxy', 'loopback, linklocal, uniquelocal');

		// Standard express middleware
		app.use(middleware());

		config.middleware(app);

		app.get('/', (req, res, next) => {
			res.body = {
				message: 'Server is running'
			};
			next();
		});

		app.use((req, res) => res.send(res.body));

		// 404
		app.use((req, res, next) => next(boom.notFound()));

		// 5xx
		app.use(function handleError(err, req, res, next) {
			if (err) {
				var statusCode = _.get(err, 'output.statusCode', (err.status || 500));
				if (!_.has(err, 'output.payload')) {
					err = boom.wrap(err, err.status);
				}

				res.status(statusCode || 500);
				res.body = err.output.payload;
				res.send(res.body);
			} else {
				next();
			}
		});

		if (!module.parent) {
			app.listen(config.port, () => {
				if (config.env === 'development' || config.env === 'test') {
					console.log(chalk.green.bold(`Server is running on port: ${config.port}`));
				}
			});
		}

		return {bus, app};
	})
	.catch(err => console.log(err.stack));

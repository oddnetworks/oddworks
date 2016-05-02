'use strict';

const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const boom = require('boom');
const express = require('express');

let userConfig = require('./default-config');

try {
	userConfig = require('./config');
} catch (e) {
	console.log(chalk.black.bgRed('./config.js NOT FOUND'));
	console.log(chalk.red('Loading default server configuration.'));
	console.log(chalk.red('You may override defaults by creating your own ./config.js file like so:'));
	console.log(chalk.red('$ cp ./default-config.js ./config.js'));
}

const config = userConfig;

const DefaultStores = require('./stores/default');
const DefaultServices = require('./services/default');
const DefaultMiddleware = require('./middleware/default');

const middleware = require('./middleware');

const oddcast = require('oddcast');
const bus = oddcast.bus();
const app = express();

// Initialize oddcast for events, commands, requests
// use sensible defaults
bus.events.use(_.get(config, 'config.oddcast.events.options', {}), _.get(config, 'config.oddcast.events.transport', oddcast.inprocessTransport()));
bus.commands.use(_.get(config, 'config.oddcast.commands.options', {}), _.get(config, 'config.oddcast.commands.transport', oddcast.inprocessTransport()));
bus.requests.use(_.get(config, 'config.oddcast.requests.options', {}), _.get(config, 'config.oddcast.requests.transport', oddcast.inprocessTransport()));

function initializer(obj) {
	console.log(chalk.black.bgBlue(`Initializing service: ${obj.service.name}`));
	return obj.service.initialize(bus, obj.options);
}

const stores = _.get(config, 'config.stores', new DefaultStores());
const services = _.get(config, 'config.services', new DefaultServices());
const oddworksMiddleware = _.get(config, 'config.middleware', DefaultMiddleware);

module.exports = Promise
	// Initialize stores
	.all(_.map(stores, initializer))
	// Initialize services
	.then(() => {
		return Promise.all(_.map(services, initializer));
	})
	// Seed the stores if in development mode
	.then(() => {
		if (_.get('config.seed', false)) {
			return require(`${dataDir}/seed`)(bus); // eslint-disable-line
		}

		return true;
	})

	// Start configuring express
	.then(() => {
		app.disable('x-powered-by');
		app.set('trust proxy', 'loopback, linklocal, uniquelocal');

		// Standard express middleware
		app.use(middleware());

		oddworksMiddleware(app);

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
					console.log(chalk.black.bgGreen(`\nServer is running on port: ${config.port}\n`));
				}
			});
		}

		return {bus, app};
	})
	.catch(err => console.log(err.stack));

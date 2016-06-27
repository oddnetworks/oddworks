/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const _ = require('lodash');
const boom = require('boom');
const express = require('express');
const oddcast = require('oddcast');

const oddworks = require('../../lib/oddworks');
const logger = require('../../lib/logger');

const StoresUtils = oddworks.storesUtils;
const ServicesUtils = oddworks.servicesUtils;
const middleware = oddworks.middleware;

const config = require('./test-config');

const bus = oddcast.bus();
const app = express();

// Initialize oddcast for events, commands, requests
bus.events.use(config.oddcast.events.options, config.oddcast.events.transport);
bus.commands.use(config.oddcast.commands.options, config.oddcast.commands.transport);
bus.requests.use(config.oddcast.requests.options, config.oddcast.requests.transport);

module.exports = StoresUtils.load(bus, config.stores)
	// Initialize stores
	.then(() => {
		// Initialize services
		return ServicesUtils.load(bus, config.services);
	})
	// Seed the stores if config.seed is true
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
				const statusCode = _.get(err, 'output.statusCode', (err.status || 500));
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
				console.log('test-server is running');
			});
		}

		return {bus, app};
	})
	.catch(err => logger.error(err.stack));

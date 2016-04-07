'use strict';

require('dotenv').config({silent: true});

const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const oddcast = require('oddcast');
const boom = require('boom');
const express = require('express');

const middleware = require('./middleware');

const bus = oddcast.bus();
const server = express();

let redis = require('fakeredis').createClient();

bus.events.use({}, oddcast.inprocessTransport());
bus.commands.use({}, oddcast.inprocessTransport());
bus.requests.use({}, oddcast.inprocessTransport());

// TODO: This is gross, consider a refactor
if (process.env.NODE_ENV !== 'development') {
	redis = require('redis').createClient(process.env.REDIS_URI);
}

// Set up the store and services you want to use
const memoryStore = require('./stores/memory');
const redisStore = require('./stores/redis');
const redisSearchStore = require('./stores/redis-search');
const identityService = require('./services/identity');
const catalogService = require('./services/catalog');
const jsonAPIService = require('./services/json-api');
// const authorizationService = require('./services/authorization');
// const eventsService = require('./services/events');

Promise
	// Initialize your stores
	.join(
		memoryStore.initialize(bus, {types: ['device', 'network']}),
		redisStore.initialize(bus, {redis, types: ['collection', 'promotion', 'video', 'view']}),
		redisSearchStore.initialize(bus, {redis, types: ['collection', 'video']})
	)

	// Initialize your services
	.then(() => {
		return Promise
			.join(
				identityService.initialize(bus, {jwtSecret: process.env.JWT_SECRET}),
				catalogService.initialize(bus, {}),
				jsonAPIService.initialize(bus, {})
				// authorizationService.initialize(bus, {redis}),
				// eventsService.initialize(bus, {redis})
			);
	})

	// Seed the stores if in development mode
	.then(() => {
		if (process.env.NODE_ENV === 'development') {
			return require('./data/seed')(bus);
		}

		return true;
	})

	// Start configuring express
	.then(() => {
		server.disable('x-powered-by');
		server.set('trust proxy', 'loopback, linklocal, uniquelocal');

		// Standard express middleware
		server.use(middleware());

		// Decode the JWT set on the X-Access-Token header and attach to req.identity
		server.use(identityService.middleware.verifyAccess({header: 'x-access-token'}));

		// Decode the JWT set on the Authorization header and attach to req.authorization
		// server.use(authorizationService.middleware({header: 'Authorization'}));

		// Attach auth endpoints
		// POST /auth/device/code
		// POST /auth/user/authorize
		// POST /auth/device/token
		// GET /auth/user/:clientUserID/devices
		// DELETE /auth/user/:clientUserID/devices/:deviceUserProfileID
		// server.use('/auth', authorizationService.router());

		// Attach events endpoint
		// POST /events
		// server.use('/events', eventsService.router());

		// Attach config endpoint
		// GET /config
		server.use('/', identityService.router());

		// Attach catalog endpoints with specific middleware, the authorization service is passed in as middleware to protect/decorate the entities as well
		// GET /videos
		// GET /videos/:id
		// GET /collections
		// GET /collections/:id
		// GET /views
		// GET /views/:id
		server.use(catalogService.router({middleware: []}));

		server.get('/', (req, res, next) => {
			res.body = {
				message: 'Server is running'
			};
			next();
		});

		// Serialize all data into the JSON API Spec
		server.use(jsonAPIService.middleware());

		server.use((req, res) => {
			res.send(res.body);
		});

		// 404
		server.use((req, res, next) => {
			next(boom.notFound());
		});

		// 5xx
		server.use(function handleError(err, req, res, next) {
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
			server.listen(process.env.PORT, () => {
				console.log('');
				console.log(chalk.green(`Server is running on port: ${process.env.PORT}`));
			});
		}
	})
	.catch(err => {
		console.log(err.stack);
	});

module.exports = server;

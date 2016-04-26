'use strict';

require('dotenv').config({silent: true});

const isDevOrTest = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
const dataDir = (process.env.DATA_DIR || './test/data');
const chalk = require('chalk');
const _ = require('lodash');
const Promise = require('bluebird');
const oddcast = require('oddcast');
const boom = require('boom');
const express = require('express');

const middleware = require('./middleware');

const bus = oddcast.bus();
const app = express();

const redis = (isDevOrTest) ? require('fakeredis').createClient() : require('redis').createClient(process.env.REDIS_URI);

bus.events.use({}, oddcast.inprocessTransport());
bus.commands.use({}, oddcast.inprocessTransport());
bus.requests.use({}, oddcast.inprocessTransport());

// Set up the store and services you want to use
const memoryStore = require('./stores/memory');
const redisStore = require('./stores/redis');
const redisSearchStore = require('./stores/redis-search');
const identityService = require('./services/identity');
const catalogService = require('./services/catalog');
const eventsService = require('./services/events');
const jsonAPIService = require('./services/json-api');
const syncService = require('./services/sync');

module.exports = Promise
	// Initialize your stores
	.join(
		memoryStore.initialize(bus, {types: ['platform', 'channel']}),
		redisStore.initialize(bus, {redis, types: ['collection', 'promotion', 'video', 'view']}),
		redisSearchStore.initialize(bus, {redis, types: ['collection', 'video']})
	)

	// Initialize your services
	.then(() => {
		return Promise
			.join(
				identityService.initialize(bus, {jwtSecret: process.env.JWT_SECRET}),
				catalogService.initialize(bus, {}),
				eventsService.initialize(bus, {
					redis,
					analyzers: [
						/* eslint-disable */
						new eventsService.analyzers.googleAnalytics({trackingId: process.env.GA_TRACKING_ID}),
						new eventsService.analyzers.mixpanel({apiKey: process.env.MIXPANEL_API_KEY, timeMultiplier: 1000})
						/* eslint-enable */
					]
				}),
				jsonAPIService.initialize(bus, {}),
				syncService.initialize(bus, {
					interval: 5000,
					providers: [
						/* eslint-disable */
						syncService.providers.vimeo({token: process.env.VIMEO_APIKEY})
						/* eslint-enable */
					]
				})
			);
	})

	// Seed the stores if in development mode
	.then(() => {
		if (isDevOrTest) {
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

		// Decode the JWT set on the X-Access-Token header and attach to req.identity
		app.use(identityService.middleware.verifyAccess({header: 'x-access-token'}));

		// Decode the JWT set on the Authorization header and attach to req.authorization
		// app.use(authorizationService.middleware({header: 'Authorization'}));

		// Attach auth endpoints
		// POST /auth/platform/code
		// POST /auth/user/authorize
		// POST /auth/platform/token
		// GET /auth/user/:clientUserID/platforms
		// DELETE /auth/user/:clientUserID/platforms/:platformUserProfileID
		// app.use('/auth', authorizationService.router());

		// Attach events endpoint
		// POST /events
		// app.use('/events', eventsService.router());

		// Attach config endpoint
		// GET /config
		app.use('/', identityService.router());

		// Attach catalog endpoints with specific middleware, the authorization service is passed in as middleware to protect/decorate the entities as well
		// GET /videos
		// GET /videos/:id
		// GET /collections
		// GET /collections/:id
		// GET /views
		// GET /views/:id
		app.use(catalogService.router({middleware: []}));

		app.use(eventsService.router());

		app.get('/', (req, res, next) => {
			res.body = {
				message: 'Server is running'
			};
			next();
		});

		// Serialize all data into the JSON API Spec
		app.use(jsonAPIService.middleware());

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
			app.listen(process.env.PORT, () => {
				if (isDevOrTest) {
					console.log('');
					console.log(chalk.green(`Sync Providers Running`));
					console.log(chalk.green(`-------------------------`));
					_.each(syncService.options.providers, provider => {
						console.log(chalk.blue('SPID: ') + chalk.cyan(provider.spid));
						console.log('');
					});
					console.log(chalk.green(`Server Running`));
					console.log(chalk.green(`--------------`));
					console.log(chalk.blue('URL: ') + chalk.cyan(`http://localhost:${process.env.PORT}`));
				}
			});
		}

		return {bus, app};
	})
	.catch(err => console.log(err.stack));

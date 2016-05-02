'use strict';

// require('dotenv').config({silent: true});

const chalk = require('chalk');
const oddcast = require('oddcast');

// In your config, this would be real redis
const redis = require('fakeredis').createClient();

// Require the stores and/or services you want to use
const memoryStore = require('./stores/memory');
const redisStore = require('./stores/redis');
const redisSearchStore = require('./stores/redis-search');
const identityService = require('./services/identity');
const catalogService = require('./services/catalog');
const eventsService = require('./services/events');
const jsonAPIService = require('./services/json-api');

// The following should be set in your environment
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'secret';
const dataDir = process.env.DATA_DIR || './test/data';
const environment = process.env.NODE_ENV || 'development';

const isDevOrTest = (environment === 'development' || environment === 'test');

console.log(chalk.black.bgYellow.bold('\nWARNING: Use a real data store for production\n'));

module.exports = {
	env: environment,
	port: port,
	dataDir: dataDir,
	seed: isDevOrTest,

	oddcast: {
		// override the default oddcast options/transports here
		events: {
			options: {},
			transport: oddcast.inprocessTransport()
		},
		commands: {
			options: {},
			transport: oddcast.inprocessTransport()
		},
		requests: {
			options: {},
			transport: oddcast.inprocessTransport()
		}
	},

	stores: [
		{
			service: memoryStore,
			options: {types: ['platform', 'channel']}
		},
		{
			service: redisStore,
			options: {redis, types: ['collection', 'promotion', 'video', 'view']}
		},
		{
			service: redisSearchStore,
			options: {redis, types: ['collection', 'video']}
		}
	],

	services: [
		{
			service: identityService,
			options: {jwtSecret: jwtSecret}
		},
		{
			service: catalogService,
			options: {}
		},
		{
			service: jsonAPIService,
			options: {}
		},
		{
			service: eventsService,
			options: {
				redis,
				analyzers: [
					/* eslint-disable */
					new eventsService.analyzers.googleAnalytics({trackingId: process.env.GA_TRACKING_ID}),
					new eventsService.analyzers.mixpanel({apiKey: process.env.MIXPANEL_API_KEY, timeMultiplier: 1000})
					/* eslint-enable */
				]
			}
		}
	],

	middleware: function (app) {
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

		// Serialize all data into the JSON API Spec
		app.use(jsonAPIService.middleware());
	}
};

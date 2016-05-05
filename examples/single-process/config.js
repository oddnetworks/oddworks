'use strict';

// const _ = require('lodash');
const chalk = require('chalk');
const path = require('path');
const oddcast = require('oddcast');
const oddworks = require('oddworks');

// In your config, this would be real redis client
const redis = require('fakeredis').createClient();

// Require the stores and/or services you want to use
const memoryStore = oddworks.stores.memory;
const redisStore = oddworks.stores.redis;
const redisSearchStore = oddworks.stores.redisSearch;
const identityService = oddworks.services.identity;
const catalogService = oddworks.services.catalog;
const eventsService = oddworks.services.events;
const jsonAPIService = oddworks.services.jsonApi;
// As an example, if you wanted to run a sync service, you
// would include the service module, then look below in the
// service configuration to see how it is used
// const syncService = require('../services/sync');

// The following should be set in your environment
// We use these values for demonstration purposes
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'secret';
const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../data/nasa');
const environment = process.env.NODE_ENV || 'development';
/* eslint-disable */
const googleAnalyticsAnalyzer = eventsService.analyzers.googleAnalytics({trackingId: 'your-google-tracking-id'});
const mixpanelAnalyzer = eventsService.analyzers.mixpanel({apiKey: 'your-mixpanel-api-key', timeMultiplier: 1000})
/* eslint-enable */

module.exports = {
	env: environment,
	port: port,
	dataDir: dataDir,
	seed: true,

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
			store: memoryStore,
			options: {types: ['platform', 'channel']}
		},
		{
			store: redisStore,
			options: {redis, types: ['collection', 'promotion', 'video', 'view']}
		},
		{
			store: redisSearchStore,
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
					googleAnalyticsAnalyzer,
					mixpanelAnalyzer
				]
			}
		}
		// Adding a sync service with a single provider
		// ,{
		// 	service: syncService,
		// 	options: {
		// 		interval: (60 * 5 * 1000),
		// 		providers: [
		// 			syncService.providers.vimeo({token: process.env.VIMEO_APIKEY})
		// 		]
		// 	}
		// }
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

// Warn the user that they should override the default configuration
console.log(
	chalk.black.bgYellow.bold('                                    WARNING!                                    ') +
	chalk.yellow.bold('\nConfig Not Found') +
	chalk.yellow.bold('\nLoading default server configuration.') +
  chalk.yellow.bold('\nYou may override defaults by creating your own configuration file like so:') +
  chalk.yellow.bold('\n\t$ cp ./config/default.js ./config/my-config.js') +
  chalk.yellow.bold('\nand setting it in the environment variable CONFIG=./config/my-config.js') +
  chalk.bgYellow('\n                                                                                '));

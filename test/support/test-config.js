'use strict';

const path = require('path');
const oddcast = require('oddcast');
const oddworks = require('../../lib/oddworks');

// In your config, this would be real redis client
const redis = require('fakeredis').createClient();

// Require the stores and/or services you want to use
const memoryStore = oddworks.stores.memory;
const redisStore = oddworks.stores.redis;
const redisSearchStore = oddworks.stores.redisSearch;
const identityService = oddworks.services.identity;
const catalogService = oddworks.services.catalog;
const storageService = oddworks.services.storage;
const eventsService = oddworks.services.events;
const jsonAPIService = oddworks.services.jsonApi;

// The following should be set in your environment
const port = 3333;
const jwtSecret = 'secret';
const dataDir = path.resolve(__dirname, './data');
const environment = 'test';

console.log('Loading ./test-config.js');

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
			options: {types: ['content', 'platform', 'channel']}
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
			service: storageService,
			options: {}
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
					eventsService.analyzers.googleAnalytics({trackingId: process.env.GA_TRACKING_ID}),
					eventsService.analyzers.mixpanel({apiKey: process.env.MIXPANEL_API_KEY, timeMultiplier: 1000})
					/* eslint-enable */
				]
			}
		}
	],

	middleware: function (app) {
		app.use(jsonAPIService.middleware.deformatter());

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

		app.use(storageService.router());

		app.use(eventsService.router());

		// Serialize all data into the JSON API Spec
		app.use(jsonAPIService.middleware.formatter());
	}
};

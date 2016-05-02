'use strict';

const identityService = require('../services/identity');
const catalogService = require('../services/catalog');
const eventsService = require('../services/events');
const jsonAPIService = require('../services/json-api');

module.exports = function (app) {
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
};

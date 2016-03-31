'use strict';

require('dotenv').config({silent: true});

const _ = require('lodash');
const Promise = require('bluebird');
const oddcast = require('oddcast');
const boom = require('boom');
const express = require('express');
const bodyParser = require('body-parser');

const bus = oddcast.bus();
const server = express();

bus.events.use({}, oddcast.inprocessTransport());
bus.commands.use({}, oddcast.inprocessTransport());
bus.requests.use({}, oddcast.inprocessTransport());

if (process.env.NODE_ENV === 'development') {
	const redis = require('redis-mock').createClient();
	Promise.promisifyAll(redis);
	require('./data/seed')(redis);
} else {
	const redis = require('redis').createClient(process.env.REDIS_URI);
	Promise.promisifyAll(redis);
}

// Set up the services you want to use
const identityService = require('./services/identity');
identityService.initialize(bus);

// const authorizationService = require('./services/authorization');
// authorizationService.initialize(bus, {redis});

// const catalogService = require('./services/catalog');
// catalogService.initialize(bus, {redis});

// const eventsService = require('./services/events');
// eventsService.initialize(bus, {redis});

// Standard express middleware
server.use(bodyParser.urlencoded({extended: true}));
server.use(bodyParser.json());

// Decode the JWT set on the X-Access-Token header and attach to req.identity
server.use(identityService.middleware({header: 'x-access-token'}));

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

// Attach catalog endpoints with specific middleware, the authorization service is passed in as middleware to protect/decorate the entities as well
// GET /videos
// GET /videos/:id
// GET /collections
// GET /collections/:id
// GET /views
// GET /views/:id
// server.use(catalogService.router([
// 	authorizationService.verify()
// ]));

server.get('/', (req, res) => {
	res.send({
		message: 'Server is running'
	});
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
	server.listen(process.env.PORT, err => {
		console.log('Server is running.');
	});
}

module.exports = server;

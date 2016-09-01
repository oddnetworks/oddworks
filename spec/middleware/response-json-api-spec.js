/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const JSONSchemaValidator = require('jsonschema').Validator;
const Validator = new JSONSchemaValidator();
const fakeredis = require('fakeredis');
const MockExpressResponse = require('mock-express-response');
const Promise = require('bluebird');
const _ = require('lodash');
const redisStore = require('../../lib/stores/redis/');
const catalogService = require('../../lib/services/catalog');
const identityService = require('../../lib/services/identity');
const responseJsonApi = require('../../lib/middleware/response-json-api');
const jsonApiSchema = require('../helpers/json-api-schema.json');
const support = require('../support/');

const COLLECTION = require('../fixtures/collections/collection-0.json');
const REL_0 = require('../fixtures/videos/video-0.json');
const REL_1 = require('../fixtures/videos/video-1.json');
const REL_2 = require('../fixtures/videos/video-2.json');

describe('Middleware Response JSON API', () => {
	let bus;
	const RES = new MockExpressResponse();
	const RES2 = new MockExpressResponse();

	const REQ = {
		protocol: 'https',
		hostname: 'example.com',
		identity: {
			channel: {id: 'channel-id'},
			platform: {id: 'platform-id'}
		},
		socket: {
			address: () => {
				return {port: 3000};
			}
		},
		query: ''
	};

	const REQ_INCLUDE = _.cloneDeep(REQ);

	// Not required for this test, but needed when coming in from the api
	REQ_INCLUDE.query = {include: 'entities,video'};

	beforeAll(done => {
		RES.body = COLLECTION;

		bus = support.createBus();

		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		return redisStore(bus, {
			types: ['collection', 'video'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {});
		})
		// Initialize the catalog service
		.then(() => {
			return catalogService(bus, {
				updateFrequency: 1
			});
		})
		.then(service => {
			this.service = service;
			return service;
		})
		.then(() => {
			const cmd = 'set';
			const role = 'store';

			return Promise.all([
				bus.sendCommand({role, cmd, type: 'video'}, REL_0),
				bus.sendCommand({role, cmd, type: 'video'}, REL_1),
				bus.sendCommand({role, cmd, type: 'video'}, REL_2),
				bus.sendCommand({role, cmd, type: 'collection'}, COLLECTION)
			]);
		})
		.then(() => {
			const args = {
				channel: 'channel-id',
				type: 'collection',
				id: COLLECTION.id,
				platform: 'platform-id',
				include: ['entities']
			};
			return bus.query({role: 'store', cmd: 'get', type: 'collection'}, args)
			.then(response => {
				RES2.body = response;
				return RES2;
			});
		})
		.then(done)
		.catch(done);
	});

	it('formats response body to valid jsonapi.org schema', () => {
		responseJsonApi({bus})(REQ, RES, err => {
			const v = Validator.validate(RES.body, jsonApiSchema);
			expect(v.valid).toBe(true);
			expect(err).toBe(undefined);
		});
	});
	it('retrieves included entities as valid jsonapi.org schema', () => {
		responseJsonApi({bus})(REQ_INCLUDE, RES2, err => {
			const v = Validator.validate(RES2.body, jsonApiSchema);
			expect(RES2.body.included.length).toBe(3);
			expect(v.valid).toBeTruthy();
			expect(err).toBe(undefined);
		});
	});
});

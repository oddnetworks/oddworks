/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const JSONSchemaValidator = require('jsonschema').Validator;
const fakeredis = require('fakeredis');
const MockExpressResponse = require('mock-express-response');
const Promise = require('bluebird');
const _ = require('lodash');
const redisStore = require('../../lib/stores/redis/');
const catalogService = require('../../lib/services/catalog');
const identityService = require('../../lib/services/identity');
const responseJsonApi = require('../../lib/middleware/response-json-api');
const jsonApiSchema = require('../helpers/json-api-schema.json');

const COLLECTION = require('../fixtures/collections/collection-0.json');
const REL_0 = require('../fixtures/videos/video-0.json');
const REL_1 = require('../fixtures/videos/video-1.json');
const REL_2 = require('../fixtures/videos/video-2.json');

const Validator = new JSONSchemaValidator();

Promise.promisifyAll(fakeredis.RedisClient.prototype);
Promise.promisifyAll(fakeredis.Multi.prototype);

describe('Middleware Response JSON API', function () {
	let bus = null;

	const REQ = {
		protocol: 'https',
		hostname: 'example.com',
		identity: {
			channel: {id: 'channel-id'},
			platform: {id: 'platform-id', platformType: 'APPLE_TV'}
		},
		socket: {
			address: () => {
				return {port: 3000};
			}
		},
		query: ''
	};

	beforeAll(function (done) {
		bus = this.createBus();

		return Promise.resolve(null)
			// Initialize a store
			.then(() => {
				return redisStore(bus, {
					types: ['collection', 'video'],
					redis: fakeredis.createClient()
				});
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
			// Seed content
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
			.then(_.noop)
			.then(done)
			.catch(done.fail);
	});

	describe('with single resource', function () {
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			res = new MockExpressResponse();
			middleware = responseJsonApi({bus});

			return Promise.resolve(null)
				// Load seed data (without using include)
				.then(() => {
					const role = 'store';
					const cmd = 'get';
					const type = 'collection';

					const args = {
						channel: 'channel-id',
						type,
						id: COLLECTION.id,
						platform: 'platform-id'
					};

					return bus.query({role, cmd, type}, args).then(result => {
						res.body = result;
					});
				})
				.then(() => {
					return middleware(req, res, err => {
						if (err) {
							return done.fail(err);
						}
						done();
					});
				})
				.then(_.noop)
				.then(done)
				.catch(done.fail);
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('has no includes array', function () {
			expect(res.body.includes).not.toBeDefined();
		});

		it('has a self link', function () {
			expect(res.body.links.self).toBe('https://example.com:3000/collections/collection-0');
		});

		it('adds a meta block', function () {
			expect(res.body.meta).toEqual({channel: 'channel-id', platform: 'APPLE_TV'});
		});
	});

	describe('with included resources', function () {
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			req.query = {include: 'entities,video'};
			res = new MockExpressResponse();
			middleware = responseJsonApi({bus});

			return Promise.resolve(null)
				// Load seed data (without using include)
				.then(() => {
					const role = 'store';
					const cmd = 'get';
					const type = 'collection';

					const args = {
						channel: 'channel-id',
						type,
						id: COLLECTION.id,
						platform: 'platform-id',
						include: ['entities']
					};

					return bus.query({role, cmd, type}, args).then(result => {
						res.body = result;
					});
				})
				.then(() => {
					return middleware(req, res, err => {
						if (err) {
							return done.fail(err);
						}
						done();
					});
				})
				.then(_.noop)
				.then(done)
				.catch(done.fail);
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('has an includes array', function () {
			expect(Array.isArray(res.body.included)).toBe(true);
			expect(res.body.included.length).toBe(3);
		});

		it('has included resources with self links', function () {
			const included = res.body.included || [];
			expect(included[0].links.self).toBe('https://example.com:3000/videos/1111-0');
			expect(included[1].links.self).toBe('https://example.com:3000/videos/1111-1');
			expect(included[2].links.self).toBe('https://example.com:3000/videos/1111-2');
		});

		it('has a self link', function () {
			expect(res.body.links.self).toBe('https://example.com:3000/collections/collection-0');
		});

		it('adds a meta block', function () {
			expect(res.body.meta).toEqual({channel: 'channel-id', platform: 'APPLE_TV'});
		});
	});
});

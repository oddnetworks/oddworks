/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const querystring = require('querystring');
const url = require('url');
const JSONSchemaValidator = require('jsonschema').Validator;
const fakeredis = require('fakeredis');
const Promise = require('bluebird');
const _ = require('lodash');
const redisStore = require('../../lib/stores/redis/');
const catalogService = require('../../lib/services/catalog');
const identityService = require('../../lib/services/identity');
const responseJsonApi = require('../../lib/middleware/response-json-api');
const jsonApiSchema = require('../helpers/json-api-schema.json');

const COLLECTION = require('../fixtures/collections/collection-0.json');
const COLLECTION_1 = require('../fixtures/collections/collection-1.json');
const COLLECTION_2 = require('../fixtures/collections/collection-2.json');
const REL_0 = require('../fixtures/videos/video-0.json');
const REL_1 = require('../fixtures/videos/video-1.json');
const REL_2 = require('../fixtures/videos/video-2.json');
const REL_A = require('../fixtures/videos/video-a.json');
const REL_B = require('../fixtures/videos/video-b.json');
const REL_C = require('../fixtures/videos/video-c.json');

const Validator = new JSONSchemaValidator();

Promise.promisifyAll(fakeredis.RedisClient.prototype);
Promise.promisifyAll(fakeredis.Multi.prototype);

describe('Middleware Response JSON API', function () {
	let bus = null;

	function mockExpressResponse() {
		return {
			status(status) {
				this.statusCode = status;
				return this;
			}
		};
	}

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
					bus.sendCommand({role, cmd, type: 'video'}, REL_A),
					bus.sendCommand({role, cmd, type: 'video'}, REL_B),
					bus.sendCommand({role, cmd, type: 'video'}, REL_C),
					bus.sendCommand({role, cmd, type: 'collection'}, COLLECTION),
					bus.sendCommand({role, cmd, type: 'collection'}, COLLECTION_1),
					bus.sendCommand({role, cmd, type: 'collection'}, COLLECTION_2)
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
			res = mockExpressResponse();
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
				.catch(this.handleError(done));
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('has no included array', function () {
			expect(res.body.included).not.toBeDefined();
		});

		it('has a self link', function () {
			expect(res.body.links.self).toBe('https://example.com:3000/collections/collection-0');
		});

		it('adds a meta block', function () {
			expect(res.body.meta).toEqual({channel: 'channel-id', platform: 'platform-id'});
		});
	});

	describe('with two collections', function () {
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			res = mockExpressResponse();
			middleware = responseJsonApi({bus});
			req.url = 'https://localhost:3000/collections';

			return Promise.resolve(null)
				// Load seed data (without using include)
				.then(() => {
					// emulates GET /collections
					const role = 'catalog';
					const cmd = 'fetchItemList';
					const type = 'collection';

					const args = {
						channel: {id: 'channel-id'},
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
				.catch(this.handleError(done));
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('has no included array', function () {
			expect(res.body.included).not.toBeDefined();
		});
	});

	describe('with included resources', function () {
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			req.query = {include: 'entities,video'};
			res = mockExpressResponse();
			middleware = responseJsonApi({bus, allowPartialIncluded: true});

			return Promise.resolve(null)
				// Load seed data
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
				.catch(this.handleError(done));
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('has an included array', function () {
			expect(Array.isArray(res.body.included)).toBe(true);
			expect(res.body.included.length).toBe(3);
			// console.log(JSON.stringify(res.body, null, 2));
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
			expect(res.body.meta).toEqual({channel: 'channel-id', platform: 'platform-id'});
		});
	});

	describe('with missing included resources', function () {
		let brokenCollection = null;
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			req.query = {include: 'entities,video'};
			res = mockExpressResponse();
			middleware = responseJsonApi({bus, allowPartialIncluded: true});

			brokenCollection = _.cloneDeep(COLLECTION);
			brokenCollection.id = _.uniqueId('broken-collection-');

			// Create broken references to videos.
			const data = brokenCollection.relationships.entities.data.map(item => {
				item.id = `xxx-${item.id}`;
				return item;
			});

			brokenCollection.relationships.entities.data = data;

			return Promise.resolve(null)
				// Seed content
				.then(() => {
					const cmd = 'set';
					const role = 'store';

					return Promise.all([
						bus.sendCommand({role, cmd, type: 'collection'}, brokenCollection)
					]);
				})
				// Load seed data
				.then(() => {
					const role = 'store';
					const cmd = 'get';
					const type = 'collection';

					const args = {
						channel: 'channel-id',
						type,
						id: brokenCollection.id,
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
				.catch(this.handleError());
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('has an included array', function () {
			expect(Array.isArray(res.body.included)).toBe(true);
			expect(res.body.included.length).toBe(0);
		});

		it('has no relationships references', function () {
			const relationships = res.body.data.relationships;
			expect(relationships.entities.data.length).toBe(0);
		});
	});

	describe('with listing data', function () {
		let req = null;
		let res = null;
		let middleware = null;
		let resources = null;

		const resourceFactory = () => {
			const collection = _.cloneDeep(COLLECTION);
			collection.id = _.uniqueId('random-resource-');
			return collection;
		};

		beforeAll(function (done) {
			middleware = responseJsonApi({bus, allowPartialIncluded: true});
			resources = _.range(14).map(resourceFactory);

			req = _.cloneDeep(REQ);
			req.url = `/collections?${querystring.stringify({'page[limit]': 14, 'page[offset]': 0})}`;

			res = mockExpressResponse();

			res.body = resources;
			res.body.linksQueries = {
				next: {
					'page[limit]': 10,
					'page[offset]': 11
				}
			};

			return middleware(req, res, err => {
				if (err) {
					return done.fail(err);
				}
				done();
			});
		});

		it('formats response body to valid jsonapi.org schema', function () {
			const v = Validator.validate(res.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('includes all the resources in the listing', function () {
			const items = res.body.data;
			expect(Array.isArray(items)).toBe(true);
			expect(items.length).toBe(14);
			expect(items[2].id).toBe(resources[2].id);
		});

		it('sets the resource self link', function () {
			const links = res.body.links;
			expect(links.self).toBe('https://example.com:3000/collections?page%5Blimit%5D=14&page%5Boffset%5D=0');
			const urlObject = url.parse(links.self);
			const query = querystring.parse(urlObject.query);
			expect(query['page[limit]']).toBe('14');
			expect(query['page[offset]']).toBe('0');
		});

		it('sets the resource next link', function () {
			const links = res.body.links;
			expect(links.next).toBe('https://example.com:3000/collections?page%5Blimit%5D=10&page%5Boffset%5D=11');
			const urlObject = url.parse(links.next);
			const query = querystring.parse(urlObject.query);
			expect(query['page[limit]']).toBe('10');
			expect(query['page[offset]']).toBe('11');
		});
	});

	describe('with baseUrlPrefix', function () {
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			req.query = {include: 'entities,video'};
			res = mockExpressResponse();
			middleware = responseJsonApi({
				bus,
				baseUrlPrefix: '/v2',
				allowPartialIncluded: true
			});

			return Promise.resolve(null)
				// Load seed data
				.then(() => {
					const role = 'store';
					const cmd = 'get';
					const type = 'collection';

					const args = {
						channel: 'channel-id',
						type,
						id: COLLECTION.id,
						platform: 'platform-id',
						include: ['entities', 'video']
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
				.catch(this.handleError(done));
		});

		it('includes base prefix in included resources links', function () {
			const included = res.body.included || [];
			expect(included[0].links.self).toBe('https://example.com:3000/v2/videos/1111-0');
			expect(included[1].links.self).toBe('https://example.com:3000/v2/videos/1111-1');
			expect(included[2].links.self).toBe('https://example.com:3000/v2/videos/1111-2');
		});

		it('includes base prefix in self link', function () {
			expect(res.body.links.self).toBe('https://example.com:3000/v2/collections/collection-0');
		});
	});

	describe('with excludePortFromLinks == true', function () {
		let req = null;
		let res = null;
		let middleware = null;

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			req.query = {include: 'entities,video'};
			res = mockExpressResponse();
			middleware = responseJsonApi({
				bus,
				excludePortFromLinks: true,
				allowPartialIncluded: true
			});

			return Promise.resolve(null)
				// Load seed data
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
				.catch(this.handleError(done));
		});

		it('excludes port from included resources links', function () {
			const included = res.body.included || [];
			expect(included[0].links.self).toBe('https://example.com/videos/1111-0');
			expect(included[1].links.self).toBe('https://example.com/videos/1111-1');
			expect(included[2].links.self).toBe('https://example.com/videos/1111-2');
		});

		it('excludes port from self link', function () {
			expect(res.body.links.self).toBe('https://example.com/collections/collection-0');
		});
	});

	describe('with partial included resourses', function () {
		let req = null;
		let res = null;
		let middleware = null;
		const RESULTS = {
			INITIAL_GET: null,
			ERRORS: null,
			SUCCESS: null
		};

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			req.query = {include: 'entities'};
			res = mockExpressResponse();
			middleware = responseJsonApi({bus});

			const role = 'store';
			const cmd = 'get';
			const type = 'collection';

			const args = {
				channel: 'channel-id',
				type,
				id: COLLECTION_1.id,
				platform: 'platform-id',
				include: ['entities']
			};

			req.url = `/${type}s/${COLLECTION_1.id}?include=entities`;

			return Promise.resolve(null)
				// Load seed data (without using include)
				.then(() => {
					return bus.query({role, cmd, type}, args).then(result => {
						// console.log('RESULT:  ', JSON.stringify(result, ' ', 2));
						res.body = result;
						RESULTS.INITIAL_GET = _.cloneDeep(res);
						return res;
					});
				})
				.then(() => {
					return middleware(req, res, err => {
						RESULTS.ERRORS = _.cloneDeep(res);
						if (err) {
							return done.fail(err);
						}
						return null;
					});
				})
				.then(() => {
					const middleware2 = responseJsonApi({bus, allowPartialIncluded: true});
					res = RESULTS.INITIAL_GET;
					return middleware2(req, res, err => {
						RESULTS.SUCCESS = _.cloneDeep(res);
						if (err) {
							return done.fail(err);
						}
						done();
					});
				})
				.then(_.noop)
				.then(done)
				.catch(this.handleError(done));
		});
		describe('and partial results NOT allowed', function () {
			it('formats response body to valid jsonapi.org schema', function () {
				const body = RESULTS.ERRORS.body;
				const v = Validator.validate(body, jsonApiSchema);
				expect(v.valid).toBe(true);
			});

			it('has missing items in the errors array', function () {
				const body = RESULTS.ERRORS.body;
				expect(body.errors).toBeTruthy();
				expect(body.errors.length).toBe(8);
			});
		});

		describe('and partial results ARE allowed', function () {
			it('formats response body to valid jsonapi.org schema', function () {
				const body = RESULTS.SUCCESS.body;
				const v = Validator.validate(body, jsonApiSchema);
				expect(v.valid).toBe(true);
			});

			it('has only present entities in the included array', function () {
				const body = RESULTS.SUCCESS.body;
				// console.log('RES.BODY:  ', JSON.stringify(res.body, ' ', 2));
				// console.log('INCLUDED:  ', JSON.stringify(res.body.included, ' ', 2));
				// console.log('ENTITIES.DATA:  ', JSON.stringify(res.body.data.relationships.entities.data, ' ', 2));
				expect(body.included).toBeDefined();
				expect(body.included.length).toBe(3);
				expect(body.included.length).toBe(body.data.relationships.entities.data.length);
			});
		});
	});

	describe('with an empty response', function () {
		let req = null;
		let res = null;
		let middleware = null;
		const RESPONSES = {
			SEARCH: null
		};

		beforeAll(function (done) {
			req = _.cloneDeep(REQ);
			res = mockExpressResponse();
			middleware = responseJsonApi({bus});
			req.url = `${REQ.protocol}://${REQ.hostname}:${REQ.socket.address().port}/search?q=axscdvf`;

			return Promise.resolve(null)
				.then(() => {
					// from stores/redis, this is the response from an empty search
					res.body = [];
				})
				.then(() => {
					return middleware(req, res, err => {
						if (err) {
							return done.fail(err);
						}
						RESPONSES.SEARCH = res;
						done();
					});
				})
				.then(_.noop)
				.then(done)
				.catch(this.handleError(done));
		});

		it('returns an empty data array', function () {
			const v = Validator.validate(RESPONSES.SEARCH.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});
	});

	describe('with an array from the relationships endpoint', function () {
		const req = _.cloneDeep(REQ);
		let res = null;
		let middleware = null;
		const RESPONSES = {
			ARRAY_RES: null
		};

		beforeAll(function (done) {
			req.url = '/collections/123/relationships/entities';

			res = mockExpressResponse();
			res.body = [
				{
					id: '1',
					type: 'video'
				},
				{
					id: '2',
					type: 'collection'
				}
			];

			middleware = responseJsonApi({bus});

			return Promise.resolve(null)
					.then(() => {
						return middleware(req, res, err => {
							if (err) {
								return done.fail(err);
							}
							RESPONSES.ARRAY_RES = res;
						});
					})
					.then(_.noop)
					.then(done)
					.catch(done.fail);
		});

		it('returns a valid api response', function () {
			const v = Validator.validate(RESPONSES.ARRAY_RES.body, jsonApiSchema);
			expect(v.valid).toBe(true);
		});

		it('returns with the expected members in the data array', function () {
			const data = (RESPONSES.ARRAY_RES.body || {}).data;
			expect(data.length).toBe(2);
			expect(data[0].id).toBe('1');
			expect(data[0].type).toBe('video');
			expect(data[1].id).toBe('2');
			expect(data[1].type).toBe('collection');
			expect(Object.keys(data[0]).length).toBe(2);
			expect(Object.keys(data[1]).length).toBe(2);
		});
	});

	describe('with a collection that has no relationships', function () {
		const req = _.cloneDeep(REQ);
		let res = null;
		let middleware = null;

		const role = 'store';
		const cmd = 'get';
		const type = 'collection';

		const RESPONSES = {
			NO_RELATIONSHIPS: null
		};

		beforeAll(function (done) {
			req.query = {include: 'foobar'};
			res = mockExpressResponse();
			res.body = _.cloneDeep(COLLECTION_2);

			middleware = responseJsonApi({bus});

			const args = {
				channel: 'channel-id',
				type,
				id: COLLECTION_2.id,
				platform: 'platform-id',
				include: ['foobar']
			};

			req.url = `/${type}s/${COLLECTION_2.id}?include=foobar`;

			return Promise.resolve(null)
				.then(() => {
					return bus.query({role, cmd, type}, args).then(result => {
						res.body = result;
						return res;
					});
				})
				.then(res => {
					return middleware(req, res, err => {
						if (err) {
							return done.fail(err);
						}
						RESPONSES.NO_RELATIONSHIPS = res;
					});
				})
				.then(_.noop)
				.then(done)
				.catch(done.fail);
		});

		it('returns a valid api response', function (done) {
			const v = Validator.validate(RESPONSES.NO_RELATIONSHIPS.body, jsonApiSchema);
			expect(v.valid).toBe(true);
			done();
		});

		it('returns with the expected members in the data array', function (done) {
			const data = (RESPONSES.NO_RELATIONSHIPS.body || {}).data;
			expect(Object.keys(data.relationships).length).toBe(0);
			expect(RESPONSES.NO_RELATIONSHIPS.body.included.length).toBe(0);
			done();
		});
	});
});

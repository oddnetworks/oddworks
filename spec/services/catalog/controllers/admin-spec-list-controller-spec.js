/* global describe, beforeAll, expect, it */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const fakeredis = require('fakeredis');
const MockExpressResponse = require('mock-express-response');
const redisStore = require('../../../../lib/stores/redis/');
const catalogService = require('../../../../lib/services/catalog');
const identityService = require('../../../../lib/services/identity');

describe('Catalog Service fetchItem', function () {
	let bus;

	const CHANNEL = {
		id: 'odd-networks',
		type: 'channel',
		title: 'Odd Networks'
	};

	const PLATFORM = {
		id: 'apple-ios',
		type: 'platform',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};

	const USER = {
		id: 'user-id',
		type: 'user',
		title: 'User',
		channel: 'odd-networks'
	};

	const COLLECTION_SPEC = {
		id: 'collection-13-spec',
		type: 'collectionSpec',
		source: 'testProvider',
		channel: 'odd-networks'
	};

	const COLLECTION_SPEC_14 = {
		id: 'collection-14-spec',
		type: 'collectionSpec',
		source: 'testProvider14',
		channel: 'odd-networks'
	};

	const COLLECTION_SPEC_DELETE = {
		id: 'collection-13-spec-delete',
		type: 'collectionSpec',
		source: 'testProvider',
		channel: 'odd-networks'
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		bus.queryHandler(
			{role: 'provider', cmd: 'get', source: 'testProvider'},
			() => {
				return Promise.resolve({
					title: 'Foo',
					description: 'Bar'
				});
			}
		);

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform', 'user', 'collectionSpec', 'collection'],
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
			this.controller = {
				spec: new this.service.CatalogSpecListController({bus, type: 'collectionSpec'})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'user'}, USER),
				bus.sendCommand({role: 'catalog', cmd: 'setItemSpec', type: 'collection'}, COLLECTION_SPEC),
				bus.sendCommand({role: 'catalog', cmd: 'setItemSpec', type: 'collection'}, COLLECTION_SPEC_DELETE),
				() => {}
			);
		})
		.then(done)
		.catch(this.handleError(done));
	});

	it('Admin POST correctly inserts a spec object', function (done) {
		const res = {
			body: {},
			status() {
			}
		};
		const req = {
			query: {},
			params: {},
			body: COLLECTION_SPEC_14,
			identity: {audience: 'admin'}
		};

		this.controller.spec.post(req, res, () => {
			expect(res.body.id).toBe('collection-14-spec');
			expect(res.body.type).toBe('collectionSpec');
			expect(res.body.source).toBe('testProvider14');
			expect(res.body.channel).toBe('odd-networks');
			done();
		});
	});

	describe('POST with missing .source', function () {
		it('returns a 422 response', function (done) {
			const spec = _.cloneDeep(COLLECTION_SPEC_14);
			delete spec.source;

			const res = new MockExpressResponse();

			const req = {
				query: {},
				params: {},
				body: spec,
				identity: {audience: 'admin'}
			};

			this.controller.spec.post(req, res, err => {
				// TODO Respond with Boom error
				expect(err).toBeTruthy();
				done();
			});
		});
	});

	describe('POST with unsupported source', function () {
		it('returns a 422 response', function (done) {
			const spec = _.cloneDeep(COLLECTION_SPEC_14);
			spec.source = 'baz';

			const res = new MockExpressResponse();

			const req = {
				query: {},
				params: {},
				body: spec,
				identity: {audience: 'admin'}
			};

			this.controller.spec.post(req, res, err => {
				// TODO Respond with Boom error
				expect(err).toBeTruthy();
				done();
			});
		});
	});

	describe('Admin GET', function () {
		it('retrieves all preset specs', function (done) {
			const res = new MockExpressResponse();
			const req = {
				query: {},
				params: {},
				body: COLLECTION_SPEC_14,
				identity: {audience: 'admin'}
			};

			req.query = {channel: 'odd-networks'};

			this.controller.spec.get(req, res, () => {
				const data = res.body || [];
				expect(data.length).toBe(3);
				expect(data[0].id).toBe('collection-13-spec');
				expect(data[1].id).toBe('collection-13-spec-delete');
				expect(data[2].id).toBe('collection-14-spec');
				done();
			});
		});
	});
});

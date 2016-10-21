/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
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
				spec: new this.service.CatalogSpecController({bus, type: 'collectionSpec'})
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

	it('updates a spec object', function () {
		const req = {
			params: {id: 'collection-13-spec'},
			query: {},
			identity: {channel: {id: 'odd-networks'}, platform: {id: 'apple-ios'}, user: {id: 'user-id'}},
			body: {
				someOtherProperty: 'Another property on the spec'
			}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.spec.patch(req, res, () => {
			expect(res.body.id).toBe('collection-13-spec');
			expect(res.body.type).toBe('collectionSpec');
			expect(res.body.source).toBe('testProvider');
			expect(res.body.someOtherProperty).toBe('Another property on the spec');
			expect(res.body.channel).toBe('odd-networks');
		});
	});

	it('deletes a spec object', function () {
		const req = {
			params: {id: 'collection-13-spec-delete'},
			query: {},
			identity: {channel: {id: 'odd-networks'}, platform: {id: 'apple-ios'}, user: {id: 'user-id'}}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.spec.delete(req, res, () => {
			expect(res.body.id).toBeUndefined();
			expect(res.body.type).toBeUndefined();
			expect(res.body.source).toBeUndefined();
			expect(res.body.someOtherProperty).toBeUndefined();
			expect(res.body.channel).toBeUndefined();
		});
	});
});

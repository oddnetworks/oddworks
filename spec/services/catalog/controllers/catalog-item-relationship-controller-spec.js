/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');
const catalogService = require('../../../../lib/services/catalog');

describe('Catalog Item Relationship Controller', function () {
	let bus;

	const CHANNEL = require('../../../fixtures/channels/test-channel.json');
	const COLLECTION = require('../../../fixtures/collections/collection-0.json');
	const PLATFORM = require('../../../fixtures/platforms/test-channel-apple-ios.json');
	const USER = require('../../../fixtures/users/user-0.json');

	const RESULTS = {
		GET: null,
		FORMAT: null
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform', 'user', 'collection', 'video'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {});
		})
		// Initialize a catalog service
		.then(() => {
			return catalogService(bus, {});
		})
		.then(service => {
			this.service = service;
			this.controller = {
				collection: new service.CatalogItemController({bus, type: 'collection'}),
				video: new service.CatalogItemController({bus, type: 'video'}),
				relationship: new service.CatalogItemRelationshipController({bus, type: 'collection'})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'user'}, USER),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'collection'}, COLLECTION),
				() => {}
			);
		})
		.then(done)
		.catch(done.fail);
	});

	it('returns a collection object', function () {
		const req = {
			params: {id: COLLECTION.id},
			query: {},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			user: {id: USER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.collection.get(req, res, () => {
			expect(res.body.id).toBe('collection-0');
			expect(res.body.type).toBe('collection');
			expect(res.body.title).toBe('Title of the thing');
			expect(res.body.channel).toBe('channel-id');
		});
	});

	it('get returns the correct relationship data', function () {
		const req = {
			params: {
				id: COLLECTION.id,
				relationshipKey: 'entities'
			},
			query: {},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			user: {id: USER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.relationship.get(req, res, () => {
			RESULTS.GET = res.body;
			expect(res.body.data.length).toBe(3);
		});
	});
});

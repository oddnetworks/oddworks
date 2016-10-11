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
	const VIEWER = require('../../../fixtures/viewers/viewer-0.json');
	const VIDEO_0 = require('../../../fixtures/videos/video-0');
	const VIDEO_1 = require('../../../fixtures/videos/video-1');
	const VIDEO_2 = require('../../../fixtures/videos/video-2');
	const COLLECTION_1 = require('../../../fixtures/collections/collection-1.json');
	const VIDEO_10 = require('../../../fixtures/videos/video-10');
	const VIDEO_11 = require('../../../fixtures/videos/video-11');
	const VIDEO_30 = require('../../../fixtures/videos/video-30');
	const VIDEO_300 = require('../../../fixtures/videos/video-300');
	const VIDEO_3 = require('../../../fixtures/videos/video-3');
	const VIDEO_4 = require('../../../fixtures/videos/video-4');
	const VIDEO_5 = require('../../../fixtures/videos/video-5');
	const VIDEO_A = require('../../../fixtures/videos/video-a');
	const VIDEO_B = require('../../../fixtures/videos/video-b');
	const VIDEO_C = require('../../../fixtures/videos/video-c');

	const RESULTS = {
		GET: null,
		INCLUDE: null,
		FORMAT: null
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform', 'viewer', 'collection', 'video'],
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
				bus.sendCommand({role: 'store', cmd: 'set', type: 'viewer'}, VIEWER),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'collection'}, COLLECTION),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_0),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_1),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_2),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'collection'}, COLLECTION_1),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_3),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_5),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_4),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_10),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_11),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_30),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_300),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_A),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_C),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO_B),
				() => {}
			);
		})
		.then(done)
		.catch(this.handleError(done));
	});

	it('get returns the correct relationship data', function (done) {
		const req = {
			params: {
				id: COLLECTION.id,
				relationshipKey: 'entities'
			},
			query: {},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			viewer: {id: VIEWER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.relationship.get(req, res, () => {
			RESULTS.GET = res.body;
			expect(res.body.data.length).toBe(3);
			done();
		});
	});

	it('with sort by title query param, returns sorted relationships', function (done) {
		const req = {
			params: {
				id: COLLECTION_1.id,
				relationshipKey: 'entities'
			},
			query: {sort: 'title'},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			viewer: {id: VIEWER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.relationship.get(req, res, () => {
			const data = res.body.data;
			expect(res.body.included).toBeFalsy();
			expect(data[0].id).toBe('1111-3');
			expect(data[1].id).toBe('1111-4');
			expect(data[2].id).toBe('1111-5');
			expect(data[3].id).toBe('1111-10');
			expect(data[4].id).toBe('1111-11');
			expect(data[5].id).toBe('1111-30');
			expect(data[6].id).toBe('1111-300');
			expect(data[7].id).toBe('1111-A');
			expect(data[8].id).toBe('1111-B');
			expect(data[9].id).toBe('1111-C');
			done();
		});
	});

	it('with sort reverse, returns sorted relationships in reverse', function (done) {
		const req = {
			params: {
				id: COLLECTION_1.id,
				relationshipKey: 'entities'
			},
			query: {sort: '-title'},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			viewer: {id: VIEWER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.relationship.get(req, res, () => {
			const data = res.body.data;
			expect(res.body.included).toBeFalsy();
			expect(data[9].id).toBe('1111-3');
			expect(data[8].id).toBe('1111-4');
			expect(data[7].id).toBe('1111-5');
			expect(data[6].id).toBe('1111-10');
			expect(data[5].id).toBe('1111-11');
			expect(data[4].id).toBe('1111-30');
			expect(data[3].id).toBe('1111-300');
			expect(data[2].id).toBe('1111-A');
			expect(data[1].id).toBe('1111-B');
			expect(data[0].id).toBe('1111-C');
			done();
		});
	});

	it('with sort by meta.episode query param, returns sorted relationships', function (done) {
		const req = {
			params: {
				id: COLLECTION_1.id,
				relationshipKey: 'entities'
			},
			query: {sort: 'meta.episode'},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			viewer: {id: VIEWER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.relationship.get(req, res, () => {
			const data = res.body.data;
			expect(res.body.included).toBeFalsy();
			expect(data[0].id).toBe('1111-3');
			expect(data[1].id).toBe('1111-4');
			expect(data[2].id).toBe('1111-5');
			expect(data[3].id).toBe('1111-A');
			expect(data[4].id).toBe('1111-B');
			expect(data[5].id).toBe('1111-C');
			expect(data[6].id).toBe('1111-10');
			expect(data[7].id).toBe('1111-11');
			expect(data[8].id).toBe('1111-30');
			expect(data[9].id).toBe('1111-300');
			done();
		});
	});

	it('with page query param, something happens', function (done) {
		const req = {
			params: {
				id: COLLECTION_1.id,
				relationshipKey: 'entities'
			},
			query: {
				sort: 'title',
				page: {
					offset: '1',
					limit: 3
				}
			},
			identity: {channel: {id: CHANNEL.id},
			platform: {id: PLATFORM.id},
			viewer: {id: VIEWER.id}}
		};
		const res = {
			body: {},
			status() {}
		};

		this.controller.relationship.get(req, res, () => {
			const data = res.body.data;
			expect(data.length).toBe(3);
			expect(data[0].id).toBe('1111-10');
			done();
		});
	});
});

/* global describe, beforeAll, it, expect, xdescribe */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');
const catalogService = require('../../../../lib/services/catalog');

describe('Catalog Service Controller', function () {
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

	const COLLECTION = {
		id: 'collection-13',
		type: 'collection',
		title: 'Collection 13',
		channel: 'odd-networks'
	};

	const COLLECTION_14 = {
		id: 'collection-14',
		type: 'collection',
		title: 'Collection 14',
		channel: {id: 'odd-networks'}
	};

	const VIDEO = {
		id: 'video-13',
		type: 'video',
		title: 'Video 13',
		channel: 'odd-networks'
	};

	const VIDEO_14 = {
		id: 'video-14',
		type: 'video',
		title: 'Video 14',
		channel: {id: 'odd-networks'}
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
				collection: new service.CatalogListController({bus, type: 'collection'}),
				video: new service.CatalogListController({bus, type: 'video'})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'user'}, USER),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'collection'}, COLLECTION),
				bus.sendCommand({role: 'catalog', cmd: 'setItem', type: 'video'}, VIDEO),
				() => {}
			);
		})
		.then(done)
		.catch(done.fail);
	});

	it('Admin POST adds a collection object', function (done) {
		const res = {
			body: {},
			status() {
			}
		};
		const req = {
			query: {},
			params: {},
			body: COLLECTION_14,
			identity: {audience: 'admin'}
		};

		this.controller.collection.post(req, res, () => {
			expect(res.body.id).toBe('collection-14');
			expect(res.body.type).toBe('collection');
			expect(res.body.title).toBe('Collection 14');
			expect(res.body.channel).toBe('odd-networks');
			done();
		});
	});

	it('Admin POST adds a video object', function (done) {
		const res = {
			body: {},
			status() {
			}
		};
		const req = {
			query: {},
			params: {},
			body: VIDEO_14,
			identity: {audience: 'admin'}
		};

		this.controller.video.post(req, res, () => {
			expect(res.body.id).toBe('video-14');
			expect(res.body.type).toBe('video');
			expect(res.body.title).toBe('Video 14');
			expect(res.body.channel).toBe('odd-networks');
			done();
		});
	});

	xdescribe('Admin GET retrieves collection objects');

	xdescribe('Admin GET retrieves video objects');
});

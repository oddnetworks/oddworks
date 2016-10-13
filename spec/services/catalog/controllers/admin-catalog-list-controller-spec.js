/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const _ = require('lodash');
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
		channel: 'odd-networks',
		source:	'test-provider'
	};

	const COLLECTION_14 = {
		id: 'collection-14',
		type: 'collection',
		title: 'Collection 14',
		channel: 'odd-networks',
		source:	'test-provider'
	};

	const VIDEO = {
		id: 'video-13',
		type: 'video',
		title: 'Video 13',
		channel: 'odd-networks',
		source:	'test-provider'
	};

	const VIDEO_14 = {
		id: 'video-14',
		type: 'video',
		title: 'Video 14',
		channel: 'odd-networks',
		source:	'test-provider'
	};

	const RES = {
		body: {},
		status() {
		}
	};

	const req = {
		query: {},
		params: {},
		body: null,
		identity: {audience: 'admin'}
	};

	const RESPONSES = {
		POST_COLLECTION: null,
		POST_VIDEO: null,
		GET_COLLECTIONS: null,
		GET_VIDEOS: null
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
		.then(() => {
			const collectionRes = _.cloneDeep(RES);
			req.body = COLLECTION_14;

			return this.controller.collection.post(req, collectionRes, () => {
				RESPONSES.POST_COLLECTION = collectionRes;
				return collectionRes;
			});
		})
		.then(() => {
			const videoRes = _.cloneDeep(RES);
			req.body = VIDEO_14;

			return this.controller.video.post(req, videoRes, () => {
				RESPONSES.POST_VIDEO = videoRes;
				return videoRes;
			});
		})
		.then(() => {
			const getCollections = _.cloneDeep(RES);
			req.body = {};
			req.query = {channel: 'odd-networks'};

			return this.controller.collection.get(req, getCollections, () => {
				RESPONSES.GET_COLLECTIONS = getCollections;
				return getCollections;
			});
		})
		.then(() => {
			const getVideos = _.cloneDeep(RES);
			req.body = {};
			req.query = {channel: 'odd-networks'};

			return this.controller.video.get(req, getVideos, () => {
				RESPONSES.GET_VIDEOS = getVideos;
				return getVideos;
			});
		})
		.then(done)
		.catch(this.handleError(done));
	});

	describe('Admin POST', function () {
		it('adds a collection object', function (done) {
			const data = (RESPONSES.POST_COLLECTION || {}).body;
			expect(data.id).toBe('collection-14');
			expect(data.type).toBe('collection');
			expect(data.title).toBe('Collection 14');
			expect(data.channel).toBe('odd-networks');
			done();
		});

		it('adds a video object', function (done) {
			const data = (RESPONSES.POST_VIDEO || {}).body;
			expect(data.id).toBe('video-14');
			expect(data.type).toBe('video');
			expect(data.title).toBe('Video 14');
			expect(data.channel).toBe('odd-networks');
			done();
		});
	});

	describe('Admin GET', function () {
		it('retrieves all available collections', function (done) {
			const data = (RESPONSES.GET_COLLECTIONS || {}).body;
			expect(data.length).toBe(2);
			expect(data[0].id).toBe('collection-13');
			expect(data[1].id).toBe('collection-14');
			done();
		});

		it('retrieves all available videos', function (done) {
			const data = (RESPONSES.GET_VIDEOS || {}).body;
			expect(data.length).toBe(2);
			expect(data[0].id).toBe('video-13');
			expect(data[1].id).toBe('video-14');
			done();
		});
	});
});

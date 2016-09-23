/* global describe, beforeAll, it, expect */
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

	const VIDEO = {
		id: 'video-13',
		type: 'video',
		title: 'Video 13',
		channel: 'odd-networks'
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
				video: new service.CatalogItemController({bus, type: 'video'})
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

	it('returns a collection object', function (done) {
		const req = {
			params: {id: 'collection-13'},
			query: {},
			identity: {
				channel: {id: 'odd-networks'},
				platform: {id: 'apple-ios'},
				user: {id: 'user-id'},
				audience: 'admin'
			}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.collection.get(req, res, () => {
			expect(res.body.id).toBe('collection-13');
			expect(res.body.type).toBe('collection');
			expect(res.body.title).toBe('Collection 13');
			expect(res.body.channel).toBe('odd-networks');
			done();
		});
	});

	it('returns a video object', function (done) {
		const req = {
			params: {id: 'video-13'},
			query: {},
			identity: {channel: {id: 'odd-networks'}, platform: {id: 'apple-ios'}, user: {id: 'user-id'}}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.video.get(req, res, () => {
			expect(res.body.id).toBe('video-13');
			expect(res.body.type).toBe('video');
			expect(res.body.title).toBe('Video 13');
			expect(res.body.channel).toBe('odd-networks');
			done();
		});
	});

	it('updates a collection object', function (done) {
		const req = {
			params: {id: 'collection-13'},
			query: {},
			identity: {
				channel: {id: 'odd-networks'},
				platform: {id: 'apple-ios'},
				user: {id: 'user-id'},
				audience: 'admin'
			},
			body: {
				title: 'Odd',
				description: 'How odd are you?'
			}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.collection.patch(req, res, () => {
			expect(res.body.id).toBe('collection-13');
			expect(res.body.type).toBe('collection');
			expect(res.body.title).toBe('Odd');
			expect(res.body.description).toBe('How odd are you?');
			done();
		});
	});

	it('updates a video object', function (done) {
		const req = {
			params: {id: 'video-13'},
			query: {},
			identity: {
				channel: {id: 'odd-networks'},
				platform: {id: 'apple-ios'},
				user: {id: 'user-id'},
				audience: 'admin'
			},
			body: {
				channel: 'odd-networks',
				actor: 'Batman'
			}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.video.patch(req, res, () => {
			expect(res.body.id).toBe('video-13');
			expect(res.body.type).toBe('video');
			expect(res.body.channel).toBe('odd-networks');
			expect(res.body.title).toBe('Video 13');
			expect(res.body.actor).toBe('Batman');
			done();
		});
	});

	it('deletes a collection object', function (done) {
		const req = {
			params: {id: 'collection-13'},
			query: {},
			identity: {channel: {id: 'odd-networks'}},
			body: {}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.collection.delete(req, res, () => {
			expect(res.body.id).toBeUndefined();
			expect(res.body.type).toBeUndefined();
			expect(res.body.title).toBeUndefined();
			expect(res.body.description).toBeUndefined();
			done();
		});
	});

	it('deletes a video object', function (done) {
		const req = {
			params: {id: 'video-13'},
			query: {},
			identity: {channel: {id: 'odd-networks'}},
			body: {}
		};
		const res = {
			body: {},
			status() {
			}
		};

		this.controller.video.delete(req, res, () => {
			expect(res.body.id).toBeUndefined();
			expect(res.body.type).toBeUndefined();
			expect(res.body.channel).toBeUndefined();
			expect(res.body.title).toBeUndefined();
			expect(res.body.category).toBeUndefined();
			done();
		});
	});
});

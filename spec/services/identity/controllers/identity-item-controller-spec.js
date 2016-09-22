/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');

describe('Identity Service Controller', function () {
	let bus;
	let res;

	const CHANNEL = {
		id: 'odd-networks',
		title: 'Odd Networks'
	};

	const PLATFORM = {
		id: 'apple-ios',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		res = {
			status() {
			}
		};

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {});
		})
		.then(service => {
			this.service = service;
			this.controller = {
				channel: new service.IdentityItemController({bus, type: 'channel'}),
				platform: new service.IdentityItemController({bus, type: 'platform'})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				() => {}
			);
		})
		.then(done)
		.catch(done.fail);
	});

	it('returns a channel object', function (done) {
		const req = {
			params: {id: 'odd-networks'},
			query: {},
			identity: {channel: {id: 'odd-networks'}}
		};

		this.controller.channel.get(req, res, () => {
			expect(res.body.id).toBe('odd-networks');
			expect(res.body.type).toBe('channel');
			expect(res.body.title).toBe('Odd Networks');
			done();
		});
	});

	it('returns a platform object', function (done) {
		const req = {
			params: {id: 'apple-ios'},
			query: {},
			identity: {channel: {id: 'odd-networks'}}
		};

		this.controller.platform.get(req, res, () => {
			expect(res.body.id).toBe('apple-ios');
			expect(res.body.type).toBe('platform');
			expect(res.body.channel).toBe('odd-networks');
			expect(res.body.title).toBe('Apple iOS');
			done();
		});
	});

	it('updates a channel object', function (done) {
		const req = {
			params: {id: 'odd-networks'},
			query: {},
			identity: {channel: {id: 'odd-networks'}},
			body: {
				title: 'Odd',
				description: 'How odd are you?'
			}
		};

		this.controller.channel.patch(req, res, () => {
			expect(res.body.id).toBe('odd-networks');
			expect(res.body.type).toBe('channel');
			expect(res.body.title).toBe('Odd');
			expect(res.body.description).toBe('How odd are you?');
			done();
		});
	});

	it('updates a platform object', function (done) {
		const req = {
			params: {id: 'apple-ios'},
			query: {},
			identity: {channel: {id: 'odd-networks'}},
			body: {
				channel: 'odd-networks',
				category: 'MOBILE'
			}
		};

		this.controller.platform.patch(req, res, () => {
			expect(res.body.id).toBe('apple-ios');
			expect(res.body.type).toBe('platform');
			expect(res.body.channel).toBe('odd-networks');
			expect(res.body.title).toBe('Apple iOS');
			expect(res.body.category).toBe('MOBILE');
			done();
		});
	});

	it('deletes a channel object', function (done) {
		const req = {
			params: {id: 'odd-networks'},
			query: {},
			identity: {channel: {id: 'odd-networks'}},
			body: {}
		};

		this.controller.channel.delete(req, res, () => {
			expect(res.body.id).toBeUndefined();
			expect(res.body.type).toBeUndefined();
			expect(res.body.title).toBeUndefined();
			expect(res.body.description).toBeUndefined();
			done();
		});
	});

	it('deletes a platform object', function (done) {
		const req = {
			params: {id: 'apple-ios'},
			query: {},
			identity: {channel: {id: 'odd-networks'}},
			body: {}
		};

		this.controller.platform.delete(req, res, () => {
			expect(res.body.id).toBeUndefined();
			expect(res.body.type).toBeUndefined();
			expect(res.body.channel).toBeUndefined();
			expect(res.body.title).toBeUndefined();
			expect(res.body.category).toBeUndefined();
			done();
		});
	});
});

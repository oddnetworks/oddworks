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

	it('returns a channel object', function () {
		const req = {
			params: {id: 'odd-networks'},
			identity: {channel: {id: 'odd-networks'}}
		};
		const res = {};

		this.controller.channel.get(req, res, () => {
			expect(res.body.id).toBe('odd-networks');
			expect(res.body.type).toBe('channel');
			expect(res.body.title).toBe('Odd Networks');
		});
	});

	it('returns a platform object', function () {
		const req = {
			params: {id: 'apple-ios'},
			identity: {channel: {id: 'odd-networks'}}
		};
		const res = {};

		this.controller.platform.get(req, res, () => {
			expect(res.body.id).toBe('apple-ios');
			expect(res.body.type).toBe('platform');
			expect(res.body.channel).toBe('odd-networks');
			expect(res.body.title).toBe('Apple iOS');
		});
	});

	it('updates a channel object', function () {
		const req = {
			params: {id: 'odd-networks'},
			identity: {channel: 'odd-networks'},
			body: {
				title: 'Odd',
				description: 'How odd are you?'
			}
		};
		const res = {};

		this.controller.channel.patch(req, res, () => {
			expect(res.body.id).toBe('odd-networks');
			expect(res.body.type).toBe('channel');
			expect(res.body.title).toBe('Odd');
			expect(res.body.description).toBe('How odd are you?');
		});
	});

	it('updates a platform object', function () {
		const req = {
			params: {id: 'apple-ios'},
			body: {
				channel: 'odd-networks'
				category: 'MOBILE'
			}
		};
		const res = {};

		this.controller.platform.patch(req, res, () => {
			expect(res.body.id).toBe('apple-ios');
			expect(res.body.type).toBe('platform');
			expect(res.body.channel).toBe('odd-networks');
			expect(res.body.title).toBe('Apple iOS');
			expect(res.body.category).toBe('MOBILE');
		});
	});
});

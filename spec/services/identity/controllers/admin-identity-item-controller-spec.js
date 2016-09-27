/* global describe, beforeAll, it, expect, xdescribe */
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

	xdescribe('Admin GET returns a channel object');

	xdescribe('Admin GET returns a platform object');

	it('Admin PATCH updates a channel object', function (done) {
		const req = {
			query: {},
			params: {id: 'odd-networks'},
			identity: {audience: 'admin'},
			body: {
				id: 'odd-networks',
				title: 'Super Awesome Odd Networks Channel'
			}
		};

		this.controller.channel.patch(req, res, () => {
			expect(res.body.id).toBe('odd-networks');
			expect(res.body.title).toBe('Super Awesome Odd Networks Channel');
			done();
		});
	});

	it('Admin PATCH updates a platform object', function (done) {
		const req = {
			params: {id: 'apple-ios'},
			query: {},
			identity: {audience: 'admin'},
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

	xdescribe('Admin DELETE deletes a channel object');

	xdescribe('Admin DELETE deletes a platform object');
});

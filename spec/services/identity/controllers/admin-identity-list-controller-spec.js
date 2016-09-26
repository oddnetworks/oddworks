/* global describe, beforeAll, expect, it, xdescribe */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');

describe('Identity Service Controller', function () {
	let bus;
	// let res;

	const CHANNEL = {
		id: 'odd-networks',
		title: 'Odd Networks'
	};

	const CHANNEL_2 = {
		channel: 'channel-2',
		type: 'channel',
		title: 'Channel 2 News | All the Odd You Can Handle'
	};

	const PLATFORM = {
		id: 'apple-ios',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};
	// TODO: two more platforms needed for testing purposes

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
				channel: new service.IdentityListController({bus, type: 'channel'}),
				platform: new service.IdentityListController({bus, type: 'platform'})
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

	it('Admin POST inserts a channel object', function (done) {
		const res = {
			body: {},
			status() {
			}
		};
		const req = {
			query: {},
			params: {},
			body: CHANNEL_2,
			identity: {audience: 'admin'}
		};

		this.controller.channel.post(req, res, () => {
			expect(res.body.channel).toBe('channel-2');
			expect(res.body.type).toBe('channel');
			expect(res.body.title).toBe('Channel 2 News | All the Odd You Can Handle');
			done();
		});
	});

	xdescribe('Admin POST inserts a platform object');

	xdescribe('Admin GET retrieves all present channel objects');

	xdescribe('Admin GET retrieves all present platform objects');
});

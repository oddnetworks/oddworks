/* global xdescribe, describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const fakeredis = require('fakeredis');

const redisSearchStore = require('../../lib/stores/redis-search/');

xdescribe('Redis Search Store', function () {
	let bus;

	beforeAll(function (done) {
		bus = this.createBus();

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		redisSearchStore
			.initialize(bus, {
				types: ['video', 'collection'],
				redis: fakeredis.createClient()
			})
			.then(done)
			.catch(done.fail);
	});

	describe('smoke test', function () {
		it('should not be smoking', function () {
			expect(1).toBeTruthy();
		});
	});
});

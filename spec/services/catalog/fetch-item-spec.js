/* global describe, beforeAll, afterAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const fakeredis = require('fakeredis');
const redisStore = require('../../../lib/stores/redis/');
const catalogService = require('../../../lib/services/catalog');

describe('Catalog Service fetchItem', function () {
	let bus;

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		redisStore(bus, {
			types: ['collectionSpec', 'collection'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		.then(() => {
			return catalogService(bus, {
				updateFrequency: 1
			});
		})
		.then(service => {
			this.service = service;
		})
		.then(done)
		.catch(done.fail);
	});

	describe('with spec and maxAge', function () {
		const CHANNEL_ID = 'hbo-go';

		// const CHANNEL = Object.freeze({
		// 	id: CHANNEL_ID,
		// 	maxAge: 1,
		// 	staleWhileRevalidate: 0,
		// 	features: {
		// 		defaultThumbnail: 'channe-image.png'
		// 	}
		// });

		// const PLATFORM = Object.freeze({
		// 	id: 'roku-123',
		// 	features: {
		// 		defaultThumbnail: 'roku-image.png'
		// 	}
		// });

		const SPEC = Object.freeze({
			channel: CHANNEL_ID,
			type: 'collectionSpec',
			source: 'testProvider'
		});

		const RESOURCE = Object.freeze({
			title: 'Foo',
			description: 'Bar'
		});

		const RESULTS = {
			spec: null
		};

		beforeAll(function (done) {
			const provider = function () {
				return Promise.resolve(_.cloneDeep(RESOURCE));
			};

			bus.queryHandler(
				{role: 'provider', cmd: 'get', source: 'testProvider'},
				provider
			);

			return Promise.resolve(null)
				.then(options => {
					return bus
						.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, SPEC)
						.then(res => {
							RESULTS.spec = res;
							return options;
						});
				})
				// .then(options => {
				// 	const args = {
				// 		channel: CHANNEL_ID,
				// 		type: 'collection',
				// 		id: RESULTS.spec.resource
				// 	};

				// 	this.bus
				// 		.sendCommand({role: 'catalog', cmd: 'fetchItem'}, spec)
				// })
				.then(done)
				.catch(done.fail);
		});

		afterAll(function () {
			// Remove the provider used for this test.
			bus.requests.remove(
				{role: 'provider', cmd: 'get', source: 'testProvider'}
			);
		});

		it('has a spec object', function () {
			expect(RESULTS.spec).toBeTruthy();
		});
	});
});

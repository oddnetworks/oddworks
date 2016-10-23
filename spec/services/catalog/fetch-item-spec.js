/* global describe, beforeAll, afterAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const fakeredis = require('fakeredis');
const redisStore = require('../../../lib/stores/redis/');
const catalogService = require('../../../lib/services/catalog');
const identityService = require('../../../lib/services/identity');

describe('Catalog Service fetchItem', function () {
	let bus;

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['collectionSpec', 'collection'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {});
		})
		// Initialize the catalog service
		.then(() => {
			return catalogService(bus, {
				updateFrequency: 1
			});
		})
		.then(service => {
			this.service = service;
		})
		.then(done)
		.catch(this.handleError(done));
	});

	describe('with spec and maxAge', function () {
		const CHANNEL_ID = 'hbo-go';

		const CHANNEL = Object.freeze({
			id: CHANNEL_ID,
			maxAge: 1,
			staleWhileRevalidate: 0,
			features: {
				defaultThumbnail: 'channe-image.png'
			}
		});

		const PLATFORM = Object.freeze({
			id: 'roku-123',
			features: {
				defaultThumbnail: 'roku-image.png'
			}
		});

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
			spec: null,
			resource: null,
			resourceSpecRemoved: null,
			afterCacheRemovesItem: 0
		};

		beforeAll(function (done) {
			this.provider = () => {
				return Promise.resolve(_.cloneDeep(RESOURCE));
			};

			spyOn(this, 'provider').and.callThrough();

			bus.queryHandler(
				{role: 'provider', cmd: 'get', source: 'testProvider'},
				this.provider
			);

			return Promise.resolve(null)
				// Create the resource by creating a spec for it.
				.then(options => {
					return bus
						.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, SPEC)
						.then(res => {
							RESULTS.spec = res;
							return options;
						});
				})
				// Delay for 1.1 seconds to get past the maxAge = 1 and force
				// a cache miss.
				.then(options => {
					return Promise.delay(1100).then(_.constant(options));
				})
				// Fetch the resource
				.then(options => {
					const args = {
						channel: CHANNEL,
						type: 'collection',
						id: RESULTS.spec.resource,
						platform: PLATFORM
					};

					return bus
						.query({role: 'catalog', cmd: 'fetchItem'}, args)
						.then(res => {
							RESULTS.resource = res;
							return options;
						});
				})
				// Delay for 1.1 seconds to get past the maxAge = 1 and force
				// a cache miss.
				.then(options => {
					return Promise.delay(1100).then(_.constant(options));
				})
				// instead of using 'removeItemSpec'
				// just do the deleting of the item manually
				.then(() => {
					const args = {
						channel: SPEC.channel,
						type: SPEC.type,
						id: RESULTS.resource.spec
					};

					// these are the meaty bits of 'removeItemSpec'
					return bus
						.sendCommand({role: 'store', cmd: 'remove', type: args.type}, args)
						.then(_.constant(true));
				})
				// Fetch the item even with the spec missing
				.then(() => {
					const args = {
						channel: CHANNEL,
						type: 'collection',
						id: RESULTS.resource.id,
						platform: PLATFORM
					};

					return bus
						.query({role: 'catalog', cmd: 'fetchItem'}, args)
						.then(res => {
							RESULTS.resourceSpecRemoved = res;
							return res;
						});
				})
				// previous fetch should have removed the item itself
				.then(() => {
					const args = {
						channel: CHANNEL,
						type: 'collection',
						id: RESULTS.resource.id,
						platform: PLATFORM
					};

					return bus
						.query({role: 'catalog', cmd: 'fetchItem'}, args)
						.then(res => {
							RESULTS.afterCacheRemovesItem = res;
							return res;
						});
				})
				.then(done)
				.catch(this.handleError(done));
		});

		afterAll(function () {
			// Remove the provider used for this test.
			bus.requests.remove(
				{role: 'provider', cmd: 'get', source: 'testProvider'}
			);
		});

		it('has returns a resource object', function () {
			const res = RESULTS.resource || {};
			expect(res.type).toBe('collection');
			expect(res.id).toMatch(/^res-/);
			expect(res.spec).toMatch(/^spec-/);
			expect(res.title).toBe('Foo');
			expect(res.description).toBe('Bar');
		});

		it('has caching meta configs', function () {
			const meta = (RESULTS.resource || {}).meta || {};
			expect(meta.maxAge).toBe(1);
			expect(meta.staleWhileRevalidate).toBe(0);
			const updatedAt = new Date(meta.updatedAt);
			expect(updatedAt.getDate()).toBe(new Date().getDate());
		});

		// Calls the provider once during setItemSpec, and again during
		// fetchItem after the maxAge forced a cache miss.
		it('called the provider 2 times', function () {
			expect(this.provider).toHaveBeenCalledTimes(2);
		});

		it('with missing spec item, returns stale resource', function () {
			expect(RESULTS.resourceSpecRemoved).toBeTruthy();
		});

		it('after finding missing spec, the item is removed', function () {
			expect(RESULTS.afterCacheRemovesItem).toBe(null);
		});
	});
});

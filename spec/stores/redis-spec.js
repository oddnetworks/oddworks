/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const fakeredis = require('fakeredis');

const redisStore = require('../../lib/stores/redis/');

describe('Redis Store', function () {
	let bus;

	const video = Object.freeze({
		title: 'Monty Python',
		length: 300
	});

	const collection = Object.freeze({
		title: 'Recommended',
		relationships: {
			videos: {
				data: [{id: 'foobarbaz', type: 'video'}]
			}
		}
	});

	beforeAll(function (done) {
		bus = this.createBus();

		redisStore
			.initialize(bus, {
				types: ['video', 'collection'],
				redis: fakeredis.createClient()
			})
			.then(done)
			.catch(done.fail);
	});

	describe('cmd:get', function () {
		const RESULTS = {
			set: {video: null, collection: null},
			get: {video: null, collection: null}
		};

		beforeAll(function (done) {
			const promise = Promise.all([
				bus.sendCommand({role: 'store', cmd: 'set', type: 'video'}, video),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'collection'}, collection)
			]);

			promise
				.then(results => {
					RESULTS.set.video = results[0];
					RESULTS.set.collection = results[1];
					return RESULTS.set;
				})
				.then(results => {
					return Promise.all([
						bus.query({role: 'store', cmd: 'get', type: 'video'}, {
							id: results.video.id,
							type: results.video.type
						}),

						bus.query({role: 'store', cmd: 'get', type: 'collection'}, {
							id: results.collection.id,
							type: results.collection.type
						})
					]);
				})
				.then(results => {
					RESULTS.get.video = results[0];
					RESULTS.get.collection = results[1];
				})
				.then(done)
				.catch(done.fail);
		});

		it('returns saved video', function () {
			const doc = RESULTS.get.video;
			expect(doc.type).toBe('video');
			expect(doc.id.length).toBe(36);
			expect(doc.title).toBe('Monty Python');
			expect(doc.length).toBe(300);
		});

		it('returns saved collection', function () {
			const doc = RESULTS.get.collection;
			expect(doc.type).toBe('collection');
			expect(doc.id.length).toBe(36);
			expect(doc.title).toBe('Recommended');

			const rel = doc.relationships.videos.data[0];
			expect(rel).toEqual({id: 'foobarbaz', type: 'video'});
		});

		describe('with include', function () {
		});

		describe('when not found', function () {
		});
	});

	describe('cmd:set', function () {
	});

	describe('cmd:scan', function () {
		describe('with limit', function () {
		});
	});
});

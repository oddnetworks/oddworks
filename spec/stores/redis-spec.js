/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const fakeredis = require('fakeredis');

const redisStore = require('../../lib/stores/redis/');

describe('Redis Store', function () {
	let bus;

	const role = 'store';

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

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

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
			Promise.resolve(null)
				// Create new records
				.then(() => {
					const cmd = 'set';
					return Promise.all([
						bus.sendCommand({role, cmd, type: 'video'}, video),
						bus.sendCommand({role, cmd, type: 'collection'}, collection)
					]);
				})
				// Record results
				.then(results => {
					RESULTS.set.video = results[0];
					RESULTS.set.collection = results[1];
					return RESULTS.set;
				})
				// Get the records by type and id
				.then(results => {
					const cmd = 'get';
					return Promise.all([
						bus.query({role, cmd, type: 'video'}, {
							id: results.video.id,
							type: results.video.type
						}),
						bus.query({role, cmd, type: 'collection'}, {
							id: results.collection.id,
							type: results.collection.type
						})
					]);
				})
				// Record results
				.then(results => {
					RESULTS.get.video = results[0];
					RESULTS.get.collection = results[1];
				})
				// End test setup
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

		it('does not return video.included', function () {
			const included = RESULTS.get.video.included || [];
			expect(included.length).toBe(0);
		});

		it('returns saved collection', function () {
			const doc = RESULTS.get.collection;
			expect(doc.type).toBe('collection');
			expect(doc.id.length).toBe(36);
			expect(doc.title).toBe('Recommended');

			const rel = doc.relationships.videos.data[0];
			expect(rel).toEqual({id: 'foobarbaz', type: 'video'});
		});

		it('does not return collection.included', function () {
			const included = RESULTS.get.collection.included || [];
			expect(included.length).toBe(0);
		});

		describe('with include', function () {
			const RESULTS = {
				get: {video: null, collection: null}
			};

			beforeAll(function (done) {
				Promise.resolve(null)
					// Create new records
					.then(() => {
						const cmd = 'set';
						return Promise.all([
							bus.sendCommand({role, cmd, type: 'video'}, video),
							bus.sendCommand({role, cmd, type: 'collection'}, collection)
						]);
					})
					// Update the records
					.then(results => {
						const video = results[0];
						const collection = results[1];
						const cmd = 'set';

						// Make a real relationship
						collection.relationships.videos.data.push({
							type: 'video',
							id: video.id
						});

						return Promise.all([
							bus.sendCommand({role, cmd, type: 'video'}, video),
							bus.sendCommand({role, cmd, type: 'collection'}, collection)
						]);
					})
					// Return results
					.then(results => {
						return {video: results[0], collection: results[1]};
					})
					// Get the records by type and id with included
					.then(results => {
						const cmd = 'get';
						return Promise.all([
							bus.query({role, cmd, type: 'video'}, {
								id: results.video.id,
								type: results.video.type,
								include: ['promotions']
							}),
							bus.query({role, cmd, type: 'collection'}, {
								id: results.collection.id,
								type: results.collection.type,
								include: ['videos']
							})
						]);
					})
					// Record results
					.then(results => {
						RESULTS.get.video = results[0];
						RESULTS.get.collection = results[1];
					})
					// End test setup
					.then(done)
					.catch(done.fail);
			});

			it('returns collection.included', function () {
				const included = RESULTS.get.collection.included || [];
				expect(included.length).toBe(1);
				const video = included[0];
				expect(video.id).toBe(RESULTS.get.video.id);
				expect(video.title).toBe('Monty Python');
			});

			it('does not return video.included', function () {
				const included = RESULTS.get.video.included || [];
				expect(included.length).toBe(0);
			});
		});

		describe('when not found', function () {
			let result;

			beforeAll(function (done) {
				Promise.resolve(null)
					.then(() => {
						return bus.query({role, cmd: 'get', type: 'video'}, {
							id: 'yadda,yadda,yadda',
							type: 'video'
						});
					})
					// Record result
					.then(res => {
						result = res;
					})
					// End test setup
					.then(done)
					.catch(done.fail);
			});

			it('returns null', function () {
				expect(result).toBe(null);
			});
		});

		describe('with unsupported type', function () {
			let result;

			beforeAll(function (done) {
				Promise.resolve(null)
					.then(() => {
						return bus.query({role, cmd: 'get', type: 'ardvark'}, {
							id: 'yadda,yadda,yadda',
							type: 'ardvark'
						});
					})
					// Record Error result
					.catch(err => {
						result = err;
					})
					// End test setup
					.then(done)
					.catch(done.fail);
			});

			it('raises an exception', function () {
				expect(result instanceof Error).toBeTruthy();
				expect(result.message).toBe('No handler for pattern role:store,cmd:get,type:ardvark');
			});
		});
	});

	describe('cmd:set', function () {
		describe('with new record', function () {
			const RESULTS = {
				set: {video: null, collection: null},
				get: {video: null, collection: null}
			};

			beforeAll(function (done) {
				Promise.resolve(null)
					// Create new records
					.then(() => {
						const cmd = 'set';
						return Promise.all([
							bus.sendCommand({role, cmd, type: 'video'}, video),
							bus.sendCommand({role, cmd, type: 'collection'}, collection)
						]);
					})
					// Record results
					.then(results => {
						RESULTS.set.video = results[0];
						RESULTS.set.collection = results[1];
						return RESULTS.set;
					})
					// Get the records by type and id
					.then(results => {
						const cmd = 'get';
						return Promise.all([
							bus.query({role, cmd, type: 'video'}, {
								id: results.video.id,
								type: results.video.type
							}),
							bus.query({role, cmd, type: 'collection'}, {
								id: results.collection.id,
								type: results.collection.type
							})
						]);
					})
					// Record results
					.then(results => {
						RESULTS.get.video = results[0];
						RESULTS.get.collection = results[1];
					})
					// End test setup
					.then(done)
					.catch(done.fail);
			});

			it('returns the new entity from cmd:set', function () {
				const video = RESULTS.set.video;
				const collection = RESULTS.set.collection;
				expect(video.id.length).toBe(36);
				expect(collection.id.length).toBe(36);
			});

			it('new video entity has an .id', function () {
				const doc = RESULTS.get.video;
				expect(doc.id.length).toBe(36);
			});

			it('new video entity has a .type', function () {
				const doc = RESULTS.get.video;
				expect(doc.type).toBe('video');
			});

			it('new collection entity has an .id', function () {
				const doc = RESULTS.get.collection;
				expect(doc.id.length).toBe(36);
			});

			it('new collection entity has a .type', function () {
				const doc = RESULTS.get.collection;
				expect(doc.type).toBe('collection');
			});
		});

		describe('with existing record', function () {
			const RESULTS = {
				set: {video: null, collection: null},
				get: {video: null, collection: null}
			};

			beforeAll(function (done) {
				Promise.resolve(null)
					// Create new records
					.then(() => {
						const cmd = 'set';
						return Promise.all([
							bus.sendCommand({role, cmd, type: 'video'}, video),
							bus.sendCommand({role, cmd, type: 'collection'}, collection)
						]);
					})
					// Update the records
					.then(results => {
						const video = results[0];
						const collection = results[1];
						const cmd = 'set';

						// Make some updates
						video.title = 'Fubar';
						collection.relationships.videos.data.push({
							type: 'video',
							id: video.id
						});

						return Promise.all([
							bus.sendCommand({role, cmd, type: 'video'}, video),
							bus.sendCommand({role, cmd, type: 'collection'}, collection)
						]);
					})
					// Record results
					.then(results => {
						RESULTS.set.video = results[0];
						RESULTS.set.collection = results[1];
						return RESULTS.set;
					})
					// Get the records by type and id
					.then(results => {
						const cmd = 'get';
						return Promise.all([
							bus.query({role, cmd, type: 'video'}, {
								id: results.video.id,
								type: results.video.type
							}),
							bus.query({role, cmd, type: 'collection'}, {
								id: results.collection.id,
								type: results.collection.type
							})
						]);
					})
					// Record results
					.then(results => {
						RESULTS.get.video = results[0];
						RESULTS.get.collection = results[1];
					})
					// End test setup
					.then(done)
					.catch(done.fail);
			});

			it('returns the updated entities from cmd:set', function () {
				const video = RESULTS.set.video;
				const collection = RESULTS.set.collection;

				expect(video.title).toBe('Fubar');

				const rel = collection.relationships.videos.data[1];
				expect(rel).toEqual({id: video.id, type: 'video'});
			});

			it('returns the updated entities from cmd:get', function () {
				const video = RESULTS.get.video;
				const collection = RESULTS.get.collection;

				expect(video.title).toBe('Fubar');

				const rel = collection.relationships.videos.data[1];
				expect(rel).toEqual({id: video.id, type: 'video'});
			});
		});
	});

	describe('cmd:scan', function () {
		// Create 20 unique entities
		const entities = _.range(20).map(n => {
			return {title: `identity-${n}`};
		});

		const type = 'video';

		let results;

		beforeAll(function (done) {
			Promise.resolve(entities)
				.then(entities => {
					const cmd = 'set';
					return Promise.all(entities.map(entity => {
						return bus.sendCommand({role, cmd, type}, entity);
					}));
				})
				.then(() => {
					return bus.query({role, cmd: 'scan', type}, {});
				})
				.then(res => {
					results = res;
				})
				.then(done)
				.catch(done.fail);
		});

		it('returns a list of entities', function () {
			expect(Array.isArray(results)).toBeTruthy();
			results.forEach(entity => {
				expect(entity.id.length).toBe(36);
				expect(entity.type).toBe(type);
				expect(_.isString(entity.title)).toBeTruthy();
			});
		});

		it('has a default limit of 10', function () {
			expect(results.length).toBe(10);
		});

		describe('with limit', function () {
			const RESULTS = {
				low: null,
				high: null
			};

			beforeAll(function (done) {
				Promise.resolve(null)
					.then(() => {
						return Promise.all([
							bus.query({role, cmd: 'scan', type}, {limit: 3}),
							bus.query({role, cmd: 'scan', type}, {limit: 20})
						]);
					})
					.then(res => {
						RESULTS.low = res[0];
						RESULTS.high = res[1];
					})
					.then(done)
					.catch(done.fail);
			});

			it('honors a low limit', function () {
				expect(RESULTS.low.length).toBe(3);
			});

			it('honors a high limit', function () {
				expect(RESULTS.high.length).toBe(20);
			});
		});
	});

	describe('cmd:batchGet', function () {
		const videos = _.range(7).map(n => {
			return {type: 'video', title: `video-${n}`};
		});

		const collections = _.range(3).map(n => {
			return {type: 'collection', title: `collection-${n}`};
		});

		let RESULTS;
		let IDS;

		beforeAll(function (done) {
			const role = 'store';
			const entities = videos.concat(collections);

			Promise.resolve(entities)
				// Create all the entities to fetch.
				.then(entities => {
					const cmd = 'set';
					return Promise.all(entities.map(entity => {
						return bus.sendCommand({role, cmd, type: entity.type}, entity);
					}));
				})
				// Record the results and batchGet half of them.
				.then(entities => {
					entities = entities.filter((entity, i) => {
						return i % 2 === 0;
					});

					IDS = entities.map(entity => {
						return entity.id;
					});

					// Add a rando one to make sure it's not found.
					entities.push({type: 'foo', id: 'bbarbaz-209348'});

					return bus.query({role, cmd: 'batchGet'}, entities);
				})
				.then(res => {
					RESULTS = res;
				})
				.then(done)
				.catch(done.fail);
		});

		it('returns expected number of results', function () {
			expect(RESULTS.length).toBe(5);
			expect(RESULTS.length).toBe(IDS.length);
		});

		it('returns actual records', function () {
			RESULTS.forEach((entity, i) => {
				if (i < 4) {
					expect(entity.type).toBe('video');
				} else {
					expect(entity.type).toBe('collection');
				}

				expect(entity.id).toBe(IDS[i]);
				expect(_.isString(entity.title)).toBeTruthy();
			});
		});
	});
});

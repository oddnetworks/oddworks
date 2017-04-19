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
		channel: 'hbogo',
		title: 'Monty Python',
		length: 300
	});

	const collection = Object.freeze({
		channel: 'hbogo',
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

		redisStore(bus, {
			types: ['channel', 'video', 'collection'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
			done();
		})
		.catch(this.handleError(done));
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
							channel: 'hbogo',
							type: results.video.type
						}),
						bus.query({role, cmd, type: 'collection'}, {
							id: results.collection.id,
							channel: 'hbogo',
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
				.catch(this.handleError(done));
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
								channel: 'hbogo',
								id: results.video.id,
								type: results.video.type,
								include: ['promotions']
							}),
							bus.query({role, cmd, type: 'collection'}, {
								channel: 'hbogo',
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
					.catch(this.handleError(done));
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

			describe('with wrong type for args.include', function () {
				let result;

				beforeAll(function (done) {
					Promise.resolve(null)
						.then(() => {
							return bus.query({role, cmd: 'get', type: 'collection'}, {
								channel: 'hbogo',
								id: RESULTS.get.collection.id,
								type: RESULTS.get.collection.type,
								include: 'entities'
							});
						})
						// Record Error result
						.catch(err => {
							result = err;
						})
						// End test setup
						.then(done)
						.catch(this.handleError(done));
				});

				it('raises an throws an error', function () {
					expect(result instanceof Error).toBeTruthy();
					expect(result.message).toBe('args.include must be an array.');
				});
			});
		});

		describe('when not found', function () {
			let result;

			beforeAll(function (done) {
				Promise.resolve(null)
					.then(() => {
						return bus.query({role, cmd: 'get', type: 'video'}, {
							channel: 'hbogo',
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
					.catch(this.handleError(done));
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
							channel: 'hbogo',
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
					.catch(this.handleError(done));
			});

			it('raises an exception', function () {
				expect(result instanceof Error).toBeTruthy();
				expect(result.message).toBe('No handler for pattern {"role":"store","cmd":"get","type":"ardvark"}');
			});
		});

		describe('with a "channel" type', function () {
			const channel = {
				name: 'HBO Go'
			};

			const type = 'channel';

			const RESULTS = {
				set: null,
				get: null
			};

			beforeAll(function (done) {
				Promise.resolve(null)
					// Create new records
					.then(() => {
						const cmd = 'set';
						return bus.sendCommand({role, cmd, type}, channel);
					})
					// Record results
					.then(res => {
						RESULTS.set = res;
						return res;
					})
					// Get the records by type and id
					.then(results => {
						const cmd = 'get';
						return bus.query({role, cmd, type}, {
							id: results.id,
							type
						});
					})
					// Record results
					.then(res => {
						RESULTS.get = res;
					})
					// End test setup
					.then(done)
					.catch(this.handleError(done));
			});

			it('returns saved channel', function () {
				const doc = RESULTS.get;
				expect(doc.type).toBe('channel');
				expect(doc.id.length).toBe(36);
				expect(doc.name).toBe('HBO Go');
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
								channel: 'hbogo',
								id: results.video.id,
								type: results.video.type
							}),
							bus.query({role, cmd, type: 'collection'}, {
								channel: 'hbogo',
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
					.catch(this.handleError(done));
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
								channel: 'hbogo',
								id: results.video.id,
								type: results.video.type
							}),
							bus.query({role, cmd, type: 'collection'}, {
								channel: 'hbogo',
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
					.catch(this.handleError(done));
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

		describe('with a channel type', function () {
			const type = 'channel';

			const channel = {
				name: 'HBO GO'
			};

			const RESULTS = {
				set: null,
				get: null
			};

			beforeAll(function (done) {
				Promise.resolve(null)
					// Create new records
					.then(() => {
						const cmd = 'set';
						return bus.sendCommand({role, cmd, type}, channel);
					})
					// Record results
					.then(res => {
						RESULTS.set = res;
						return res;
					})
					// Get the records by type and id
					.then(res => {
						const cmd = 'get';
						return bus.query({role, cmd, type}, {
							id: res.id,
							type
						});
					})
					// Record results
					.then(res => {
						RESULTS.get = res;
					})
					// End test setup
					.then(done)
					.catch(this.handleError(done));
			});

			it('returns the new entity from cmd:set', function () {
				expect(RESULTS.set.id.length).toBe(36);
			});

			it('new channel entity has an .id', function () {
				expect(RESULTS.get.id.length).toBe(36);
				expect(RESULTS.get.id).toBe(RESULTS.set.id);
			});

			it('new entity has a .type', function () {
				expect(RESULTS.get.type).toBe('channel');
			});
		});
	});

	describe('cmd:remove', function () {
		const RESULTS = {
			GET_BEFORE: null,
			GET_AFTER: null
		};

		const entities = _.range(3).map(n => {
			return {title: `identity-${n}`, channel: 'oddnews'};
		});

		const type = 'video';
		const channel = 'oddnews';

		beforeAll(function (done) {
			Promise.resolve(entities)
				.then(entities => {
					const cmd = 'set';
					return Promise.all(entities.map(entity => {
						return bus.sendCommand({role, cmd, type}, entity);
					}));
				})
				.then(() => {
					return bus.query({role, cmd: 'scan', type}, {channel});
				})
				.then(res => {
					RESULTS.GET_BEFORE = res;
					return res;
				})
				.then(() => {
					const video = RESULTS.GET_BEFORE[0];
					return bus.sendCommand({role, cmd: 'remove', type}, {id: video.id, channel});
				})
				.then(() => {
					return bus.query({role, cmd: 'scan', type}, {channel});
				})
				.then(res => {
					RESULTS.GET_AFTER = res;
					return res;
				})
				.then(done)
				.catch(done.fail);
		});

		it('should remove an item', function (done) {
			expect(RESULTS.GET_BEFORE.length).toBe(3);
			expect(RESULTS.GET_AFTER.length).toBe(2);
			done();
		});
	});

	describe('cmd:scan', function () {
		// Create 20 unique entities
		const entities = _.range(20).map(n => {
			return {title: `identity-${n}`, channel: 'hbogo'};
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
					return bus.query({role, cmd: 'scan', type}, {channel: 'hbogo'});
				})
				.then(res => {
					results = res;
				})
				.then(done)
				.catch(this.handleError(done));
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
							bus.query({role, cmd: 'scan', type}, {
								channel: 'hbogo',
								limit: 3
							}),
							bus.query({role, cmd: 'scan', type}, {
								channel: 'hbogo',
								limit: 20
							})
						]);
					})
					.then(res => {
						RESULTS.low = res[0];
						RESULTS.high = res[1];
					})
					.then(done)
					.catch(this.handleError(done));
			});

			it('honors a low limit', function () {
				expect(RESULTS.low.length).toBe(3);
			});

			it('honors a high limit', function () {
				expect(RESULTS.high.length).toBe(20);
			});
		});

		describe('with paging', function () {
			const RESULTS = {
				page1: null,
				page2: null
			};

			const limit = 5;

			beforeAll(function (done) {
				Promise.resolve(null)
					// Get the first page.
					.then(() => {
						return bus.query({role, cmd: 'scan', type}, {
							channel: 'hbogo',
							limit,
							lastEvaluatedKey: {}
						});
					})
					.then(res => {
						RESULTS.page1 = res;
					})
					// Get the second page using the lastEvaluatedKey.
					.then(() => {
						return bus.query({role, cmd: 'scan', type}, {
							channel: 'hbogo',
							limit,
							lastEvaluatedKey: RESULTS.page1.lastEvaluatedKey
						});
					})
					.then(res => {
						RESULTS.page2 = res;
					})
					.then(done)
					.catch(this.handleError(done));
			});

			it('returns requested pages', function () {
				expect(RESULTS.page1).toBeTruthy();
				expect(RESULTS.page2).toBeTruthy();

				expect(Array.isArray(RESULTS.page1.results)).toBe(true);
				expect(Array.isArray(RESULTS.page2.results)).toBe(true);

				expect(typeof RESULTS.page1.lastEvaluatedKey.cursor).toBe('number');
				expect(typeof RESULTS.page2.lastEvaluatedKey.cursor).toBe('number');
			});

			it('has fuzzy length limit', function () {
				expect(RESULTS.page1.results.length >= limit).toBe(true);
				expect(RESULTS.page2.results.length >= limit).toBe(true);
			});

			it('has no duplicates between pages', function () {
				const firstPage = RESULTS.page1.results.map(item => item.id);
				const secondPage = RESULTS.page2.results.map(item => item.id);

				secondPage.forEach(id => {
					expect(firstPage).not.toContain(id);
				});
			});

			it('returns only specified type', function () {
				let types = RESULTS.page1.results.map(item => item.type);
				types = types.concat(RESULTS.page2.results.map(item => item.type));
				types = _.uniq(types);

				expect(types.length).toBe(1);
				expect(types[0]).toBe('video');
			});
		});

		describe('with wrong channel', function () {
			let results;

			beforeAll(function (done) {
				Promise.resolve(null)
					.then(() => {
						return bus.query({role, cmd: 'scan', type}, {
							channel: 'wrong-channel'
						});
					})
					.then(res => {
						results = res;
					})
					.then(done)
					.catch(this.handleError(done));
			});

			it('honors the channel filter', function () {
				expect(results.length).toBe(0);
			});
		});

		describe('channels', function () {
			// Create 20 unique entities
			const entities = _.range(20).map(n => {
				return {name: `Channel-${n}`};
			});

			const type = 'channel';

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
					.catch(this.handleError(done));
			});

			it('returns a list of entities', function () {
				expect(Array.isArray(results)).toBeTruthy();
				results.forEach(entity => {
					expect(entity.id.length).toBe(36);
					expect(entity.type).toBe(type);
					expect(_.isString(entity.name)).toBeTruthy();
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
								bus.query({role, cmd: 'scan', type}, {
									limit: 3
								}),
								bus.query({role, cmd: 'scan', type}, {
									limit: 20
								})
							]);
						})
						.then(res => {
							RESULTS.low = res[0];
							RESULTS.high = res[1];
						})
						.then(done)
						.catch(this.handleError(done));
				});

				it('honors a low limit', function () {
					expect(RESULTS.low.length).toBe(3);
				});

				it('honors a high limit', function () {
					expect(RESULTS.high.length).toBe(20);
				});
			});
		});
	});

	describe('cmd:batchGet', function () {
		const videos = _.range(14).map(n => {
			return {
				channel: (n % 2) ? 'hbogo' : 'foo-channel-1',
				type: 'video',
				title: `video-${n}`
			};
		});

		const collections = _.range(6).map(n => {
			return {
				channel: (n % 2) ? 'hbogo' : 'foo-channel-1',
				type: 'collection',
				title: `collection-${n}`
			};
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
				// Record the results and batchGet them.
				.then(entities => {
					IDS = entities
						.filter(entity => {
							return entity.channel === 'hbogo';
						})
						.map(entity => {
							return entity.id;
						});

					// Add a randos to make sure they're not found.
					entities.push({type: 'foo', id: _.sample(IDS)});
					entities.push({type: 'video', id: 'bbarbaz-209348'});
					entities.push({type: 'collection', id: 'bbarbaz-209348'});

					return bus.query({role, cmd: 'batchGet', store: 'redis-store'}, {
						channel: 'hbogo',
						keys: entities
					});
				})
				.then(res => {
					RESULTS = res;
				})
				.then(done)
				.catch(this.handleError(done));
		});

		it('returns expected number of results', function () {
			expect(RESULTS.length).toBe(10);
			expect(RESULTS.length).toBe(IDS.length);
		});

		it('returns actual records', function () {
			RESULTS.forEach((entity, i) => {
				if (i < 7) {
					expect(entity.type).toBe('video');
				} else {
					expect(entity.type).toBe('collection');
				}

				expect(entity.id).toBe(IDS[i]);
				expect(_.isString(entity.title)).toBeTruthy();
			});
		});

		describe('channels', function () {
			const type = 'channel';

			const channels = _.range(6).map(n => {
				return {
					name: `Channel-${n}`
				};
			});

			let RESULTS;
			let IDS;

			beforeAll(function (done) {
				const role = 'store';

				Promise.resolve(channels)
					// Create all the entities to fetch.
					.then(entities => {
						const cmd = 'set';
						return Promise.all(entities.map(entity => {
							return bus.sendCommand({role, cmd, type}, entity);
						}));
					})
					// Record the results and batchGet them.
					.then(entities => {
						IDS = entities.map(entity => {
							return entity.id;
						});

						// Add a randos to make sure they're not found.
						entities.push({id: 'bbarbaz-209348'});

						return bus.query({role, cmd: 'batchGet', store: 'redis-store', type}, {
							keys: entities
						});
					})
					.then(res => {
						RESULTS = res;
					})
					.then(done)
					.catch(this.handleError(done));
			});

			it('returns expected number of results', function () {
				expect(RESULTS.length).toBe(6);
				expect(RESULTS.length).toBe(IDS.length);
			});

			it('returns actual records', function () {
				RESULTS.forEach((entity, i) => {
					expect(entity.type).toBe('channel');
					expect(entity.id).toBe(IDS[i]);
					expect(_.isString(entity.name)).toBeTruthy();
				});
			});
		});
	});
});

/* global describe, beforeAll, beforeEach, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');
const catalogService = require('../../../../lib/services/catalog');

describe('Identity Viewers Relationship Controller', function () {
	let bus;
	let res;
	let res2;

	const VIDEO_1 = {
		id: 'video-1',
		type: 'video',
		channel: 'odd-networks',
		title: 'Video One'
	};

	const VIDEO_2 = {
		id: 'video-2',
		type: 'video',
		channel: 'odd-networks',
		title: 'Video Two'
	};

	const CHANNEL = {
		id: 'odd-networks',
		title: 'Odd Networks'
	};

	const PLATFORM = {
		id: 'apple-ios',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};

	const VIEWER = {
		id: 'bingewatcher@oddnetworks.com',
		type: 'viewer',
		channel: 'odd-networks',
		relationships: {
			watchlist: {
				data: [
					{id: VIDEO_1.id, type: 'video'}
				]
			}
		}
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform', 'viewer', 'video', 'collection', 'progress'],
			redis: fakeredis.createClient()
		})
			.then(store => {
				this.store = store;
			})
			.then(() => {
				return catalogService(bus);
			})
			.then(service => {
				this.service = service;
				this.controller = {
					progress: new service.CatalogProgressController({bus})
				};
			})
			.then(() => {
				return identityService(bus, {
					jwtSecret: 'secret'
				});
			})
			.then(() => {
				return Promise.join(
					bus.sendCommand({role: 'store', cmd: 'set', type: 'video'}, VIDEO_1),
					bus.sendCommand({role: 'store', cmd: 'set', type: 'video'}, VIDEO_2),
					bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
					bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
					bus.sendCommand({role: 'store', cmd: 'set', type: 'viewer'}, VIEWER),
					() => {}
				);
			})
			.then(done)
			.catch(this.handleError(done));
	});

	describe('POST', function () {
		beforeEach(function (done) {
			res = {
				status() {
				},
				body: {}
			};
			res2 = res;
			done();
		});

		describe('as platform', function () {
			it('creates and updates progress', function (done) {
				const req = {
					identity: {
						channel: CHANNEL,
						platform: PLATFORM,
						viewer: VIEWER
					},
					params: {
						id: VIDEO_1.id
					},
					body: {
						position: 131313
					}
				};

				this.controller.progress.post(req, res, () => {
					expect(res.body.id).toBe(`${VIDEO_1.id}:${VIEWER.id}`);
					expect(res.body.type).toBe('progress');
					expect(res.body.position).toBe(131313);
					expect(res.body.complete).toBe(false);
					expect(res.body.meta.updatedAt).toBeDefined();

					req.body = {
						position: 20000,
						complete: true
					};
					this.controller.progress.post(req, res2, () => {
						expect(res2.body.id).toBe(`${VIDEO_1.id}:${VIEWER.id}`);
						expect(res2.body.type).toBe('progress');
						expect(res2.body.position).toBe(20000);
						expect(res2.body.complete).toBe(true);
						done();
					});
				});
			});

			it('responds with 403 when a viewer is not present', function (done) {
				const req = {
					identity: {
						channel: CHANNEL,
						platform: PLATFORM
					},
					params: {
						id: VIDEO_1.id
					},
					body: {
						position: 131313
					}
				};

				this.controller.progress.post(req, res, err => {
					expect(err.output.statusCode).toBe(403);
					done();
				});
			});

			it('responds with 422 when payload is empty', function (done) {
				const req = {
					identity: {
						channel: CHANNEL,
						platform: PLATFORM,
						viewer: VIEWER
					},
					params: {
						id: VIDEO_1.id
					}
				};

				req.body = {};
				this.controller.progress.post(req, res, err => {
					expect(err.output.statusCode).toBe(422);
					done();
				});
			});

			it('responds with 422 when position is not valid', function (done) {
				const req = {
					identity: {
						channel: CHANNEL,
						platform: PLATFORM,
						viewer: VIEWER
					},
					params: {
						id: VIDEO_1.id
					}
				};

				req.body = {progress: -233333};
				this.controller.progress.post(req, res, err => {
					expect(err.output.statusCode).toBe(422);
					done();
				});
			});

			it('responds with 422 when complete is not valid', function (done) {
				const req = {
					identity: {
						channel: CHANNEL,
						platform: PLATFORM,
						viewer: VIEWER
					},
					params: {
						id: VIDEO_1.id
					}
				};

				req.body = {complete: 'sure'};
				this.controller.progress.post(req, res, err => {
					expect(err.output.statusCode).toBe(422);
					done();
				});
			});
		});
	});

	// describe('POST', function () {
	// 	beforeEach(function (done) {
	// 		res = {
	// 			status() {},
	// 			sendStatus() {},
	// 			body: {}
	// 		};
	// 		done();
	// 	});
	//
	// 	describe('as platform', function () {
	// 		it('posts a new item to the watchlist for a viewer', function (done) {
	// 			const req = {
	// 				identity: {
	// 					channel: CHANNEL,
	// 					platform: PLATFORM,
	// 					viewer: VIEWER
	// 				},
	// 				params: {
	// 					id: 'bingewatcher@oddnetworks.com'
	// 				},
	// 				body: {id: VIDEO_2.id, type: 'video'}
	// 			};
	//
	// 			this.controller.viewerRelationship.post(req, res)
	// 				.then(viewer => {
	// 					expect(viewer.relationships.watchlist.data.length).toBe(3);
	// 					done();
	// 				});
	// 		});
	// 	});
	// 	describe('as admin', function () {
	// 		it('posts an exiting item to the watchlist for a viewer', function (done) {
	// 			const req = {
	// 				identity: {
	// 					channel: CHANNEL,
	// 					platform: PLATFORM,
	// 					audience: ['admin']
	// 				},
	// 				params: {
	// 					id: 'bingewatcher@oddnetworks.com'
	// 				},
	// 				body: {id: VIDEO_2.id, type: 'video'}
	// 			};
	//
	// 			this.controller.viewerRelationship.post(req, res)
	// 				.then(viewer => {
	// 					expect(viewer.relationships.watchlist.data.length).toBe(3);
	// 					done();
	// 				});
	// 		});
	// 	});
	// });
	//
	// describe('DELETE', function () {
	// 	beforeEach(function (done) {
	// 		res = {
	// 			status() {},
	// 			sendStatus() {},
	// 			body: {}
	// 		};
	// 		done();
	// 	});
	//
	// 	describe('as platform', function () {
	// 		it('deletes an item on the watchlist for a viewer', function (done) {
	// 			const req = {
	// 				identity: {
	// 					channel: CHANNEL,
	// 					platform: PLATFORM,
	// 					viewer: VIEWER
	// 				},
	// 				params: {
	// 					id: 'bingewatcher@oddnetworks.com'
	// 				},
	// 				body: {id: VIDEO_2.id, type: 'video'}
	// 			};
	//
	// 			this.controller.viewerRelationship.delete(req, res)
	// 				.then(viewer => {
	// 					expect(viewer.relationships.watchlist.data.length).toBe(2);
	// 					done();
	// 				});
	// 		});
	// 	});
	// 	describe('as admin', function () {
	// 		it('deletes an item on the watchlist for a viewer', function (done) {
	// 			const req = {
	// 				identity: {
	// 					channel: CHANNEL,
	// 					platform: PLATFORM,
	// 					audience: ['admin']
	// 				},
	// 				params: {
	// 					id: 'bingewatcher@oddnetworks.com'
	// 				},
	// 				body: {id: VIDEO_1.id, type: 'video'}
	// 			};
	//
	// 			this.controller.viewerRelationship.delete(req, res)
	// 				.then(viewer => {
	// 					expect(Array.isArray(viewer.relationships.watchlist.data)).toBe(false);
	// 					expect(viewer.relationships.watchlist.data.id).toBe(COLLECTION_1.id);
	// 					expect(viewer.relationships.watchlist.data.type).toBe(COLLECTION_1.type);
	// 					done();
	// 				});
	// 		});
	// 	});
	// });
});

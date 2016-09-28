/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');

const redisStore = require('../../lib/stores/redis');
const redisSearchStore = require('../../lib/stores/redis-search');

describe('Redis Search Store', function () {
	const redisClient = fakeredis.createClient();
	let bus;

	const VIDEOS = [
		{id: 'video-1', type: 'video', title: 'Video One', channel: 'odd-networks'},
		{id: 'video-2', type: 'video', title: 'Video Two', channel: 'odd-networks'},
		{id: 'video-3', type: 'video', title: 'Video Three', channel: 'odd-networks'}
	];

	const COLLECTIONS = [
		{id: 'collection-1', type: 'collection', title: 'Collection One', channel: 'odd-networks'},
		{id: 'collection-2', type: 'collection', title: 'Collection Two', channel: 'odd-networks'},
		{id: 'collection-3', type: 'collection', title: 'Collection Three', channel: 'odd-networks'}
	];

	const RESOURCES = VIDEOS.concat(COLLECTIONS);

	const RESPONSES = {
		videoResults: null,
		threeResults: null
	};

	Promise.promisifyAll(fakeredis.RedisClient.prototype);
	Promise.promisifyAll(fakeredis.Multi.prototype);

	beforeAll(function (done) {
		bus = this.createBus();

		redisStore(bus, {
			types: ['video', 'collection'],
			redis: redisClient
		})
		.then(store => {
			return redisSearchStore(bus, {
				redis: redisClient,
				store
			});
		})
		.then(() => {
			return Promise.map(RESOURCES, resource => {
				return bus.sendCommand({role: 'store', cmd: 'set', type: resource.type}, resource);
			});
		})
		.then(() => {
			return Promise.map(RESOURCES, resource => {
				return bus.sendCommand({role: 'store', cmd: 'index', type: resource.type}, {id: resource.id, text: resource.title});
			});
		})
		.then(() => {
			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'video'});
		})
		.then(videoResults => {
			RESPONSES.videoResults = videoResults;

			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'three'});
		})
		.then(threeResults => {
			RESPONSES.threeResults = threeResults;

			return true;
		})
		.then(done)
		.catch(done.fail);
	});

	describe('"video" Results', function () {
		it('should have 3 results of videos only', function (done) {
			expect(RESPONSES.videoResults.length).toBe(3);
			RESPONSES.videoResults.forEach(result => {
				expect(result.type).toBe('video');
			});
			done();
		});
	});

	describe('"three" Results', function () {
		it('should have 2 results of a video and collection', function (done) {
			expect(RESPONSES.threeResults.length).toBe(2);
			expect(RESPONSES.threeResults[0].id).toBe('video-3');
			expect(RESPONSES.threeResults[1].id).toBe('collection-3');
			done();
		});
	});
});

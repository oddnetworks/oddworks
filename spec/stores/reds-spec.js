/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');

const redisStore = require('../../lib/stores/redis');
const redsStore = require('../../lib/stores/reds');

const catalogService = require('../../lib/services/catalog');

describe('reds Store', function () {
	const redisClient = fakeredis.createClient();
	let bus;

	const VIDEOS = [
		{id: 'video-1', type: 'video', title: 'Video One', channel: 'odd-networks', genres: ['ott', 'televition', 'on-demand'], meta: {internal: {searchable: true}}},
		{id: 'video-2', type: 'video', title: 'Video Two', channel: 'odd-networks', meta: {internal: {searchable: true}}},
		{id: 'video-3', type: 'video', title: 'Video Three', channel: 'odd-networks', meta: {internal: {searchable: true}}},
		{id: 'video-4', type: 'video', title: 'Video Four', channel: 'odd-networks'},
		{id: 'video-5', type: 'video', title: 'Video Three', channel: 'odd-networks'}
	];

	const COLLECTIONS = [
		{id: 'collection-1', type: 'collection', title: 'Collection One', channel: 'odd-networks', meta: {internal: {searchable: true}}},
		{id: 'collection-2', type: 'collection', title: 'Collection Two', channel: 'odd-networks', meta: {internal: {searchable: true}}},
		{id: 'collection-3', type: 'collection', title: 'Collection Three', channel: 'odd-networks', meta: {internal: {searchable: true}}}
	];

	const RESOURCES = VIDEOS.concat(COLLECTIONS);

	const RESPONSES = {
		videoResults: null,
		threeResults: null,
		genreResults: null,
		noResults: null,
		threeResultsAgain: null
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
			return redsStore(bus, {
				redis: redisClient,
				autoindex: true,
				store
			});
		})
		.then(() => {
			return catalogService(bus, {
				updateFrequency: 1
			});
		})
		.then(() => {
			// Set the all resources and let autoindexing happen
			return Promise.map(RESOURCES, resource => {
				return bus.sendCommand({role: 'store', cmd: 'set', type: resource.type}, resource);
			});
		})
		.then(() => {
			// Force indexing of collections
			return Promise.map(COLLECTIONS, resource => {
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

			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'Al is awesome'});
		})
		.then(noResults => {
			RESPONSES.noResults = noResults;

			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'ott'});
		})
		.then(genreResults => {
			RESPONSES.genreResults = genreResults;

			return bus.sendCommand({role: 'store', cmd: 'remove', type: 'collection'}, {id: 'collection-3', type: 'collection', channel: 'odd-networks'});
		})
		.then(() => {
			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'three'});
		})
		.then(threeResultsAgain => {
			RESPONSES.threeResultsAgain = threeResultsAgain;

			return true;
		})
		.then(done)
		.catch(this.handleError(done));
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

	describe('No Results', function () {
		it('should have 0 results', function (done) {
			expect(RESPONSES.noResults.length).toBe(0);
			done();
		});
	});

	describe('Genre Results', function () {
		it('should have 1 result', function (done) {
			expect(RESPONSES.genreResults.length).toBe(1);
			done();
		});
	});
});

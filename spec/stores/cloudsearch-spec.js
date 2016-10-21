/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const aws = require('mock-aws');

const redisStore = require('../../lib/stores/redis');
const cloudsearchStore = require('../../lib/stores/cloudsearch');

describe('Cloudsearch Store', function () {
	const redisClient = fakeredis.createClient();
	const cloudsearch = new aws.CloudSearchDomain({endpoint: 'http://cloudsearch.tld'});
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
		threeResults: null,
		noResults: null
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
			return cloudsearchStore(bus, {
				cloudsearch,
				store
			});
		})
		.then(() => {
			return Promise.map(RESOURCES, resource => {
				return bus.sendCommand({role: 'store', cmd: 'set', type: resource.type}, resource);
			});
		})
		.then(() => {
			aws.mock('CloudSearchDomain', 'search', {
				hits: {
					hit: [
						{id: 'video-1'},
						{id: 'video-2'},
						{id: 'video-3'}
					]
				}
			});

			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'video'});
		})
		.then(videoResults => {
			RESPONSES.videoResults = videoResults;

			aws.restore('CloudSearchDomain');
			aws.mock('CloudSearchDomain', 'search', {
				hits: {
					hit: [
						{id: 'video-3'},
						{id: 'collection-3'}
					]
				}
			});

			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'three'});
		})
		.then(threeResults => {
			RESPONSES.threeResults = threeResults;

			aws.restore('CloudSearchDomain');
			aws.mock('CloudSearchDomain', 'search', {
				hits: {
					hit: []
				}
			});

			return bus.query({role: 'store', cmd: 'query'}, {channel: 'odd-networks', query: 'Al is awesome'});
		})
		.then(noResults => {
			RESPONSES.noResults = noResults;

			aws.restore('CloudSearchDomain');

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
});

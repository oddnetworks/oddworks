'use strict';

const test = require('tape');
const request = require('supertest');

const testHelper = require('./support/test-helper');

let server;
const oddworks = require('./support/test-server');
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJjaGFubmVsIjoib2RkLW5ldHdvcmtzIiwicGxhdGZvcm0iOiJhcHBsZS1pb3MiLCJzY29wZSI6WyJwbGF0Zm9ybSJdLCJpYXQiOjE0NjA5ODg5NzB9.-k0wFuWD3FFaRZ7btIad9hiJJyEIBqiR4cS8cGeGMoM';

const eventsService = require('../lib/services/events');

test('Server - Setup', t => {
	eventsService.initialize(testHelper.bus, {analyzers: []});

	oddworks
		.then(result => {
			server = result;
			t.end();
		});
});

test('Server - Route: /config', t => {
	t.plan(2);

	request(server.app)
		.get('/config')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.end(function (err, res) {
			t.equal(res.header['content-type'], 'application/json; charset=utf-8', 'has proper content-type');
			t.equal(res.status, 200, 'successful');
			t.end(err);
		});
});

test('Server - Route: /:type(channels|platforms)/:id?', t => {
	t.plan(2);

	// POST a new channel
	request(server.app)
		.post('/channels')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.send({
			data: {
				id: 'my-new-channel',
				type: 'channel',
				attributes: {
					title: 'My New Channel'
				}
			}
		})
		.expect(202)
		.expect('Content-Type', /json/)
		.end(() => {
			// PUT channel updates
			request(server.app)
				.put('/channels/my-new-channel')
				.set('Accept', 'application/json')
				.set('x-access-token', accessToken)
				.send({
					data: {
						id: `my-new-channel`,
						type: 'channel',
						attributes: {
							title: 'My New Channel Name',
							description: 'Channel Desc'
						}
					}
				})
				.expect(202)
				.expect('Content-Type', /json/)
				.end(() => {
					// PATCH channel updates
					request(server.app)
						.patch('/channels/my-new-channel')
						.set('Accept', 'application/json')
						.set('x-access-token', accessToken)
						.send({
							data: {
								id: `my-new-channel`,
								type: 'channel',
								attributes: {
									description: 'Channel Description'
								}
							}
						})
						.expect(202)
						.expect('Content-Type', /json/)
						.end(() => {
							// GET channel
							request(server.app)
								.get('/channels/my-new-channel')
								.set('Accept', 'application/json')
								.set('x-access-token', accessToken)
								.expect(200)
								.expect('Content-Type', /json/)
								.end((err, res) => {
									t.equal(res.body.data.attributes.title, 'My New Channel Name');
									t.equal(res.body.data.attributes.description, 'Channel Description');
									t.end(err);
								});
						});
				});
		});
});

test('Server - Route: /events', t => {
	t.plan(1);

	request(server.app)
		.post('/events')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.send({
			data: {
				id: `event-${new Date().getTime()}`,
				type: 'event',
				attributes: {
					key1: 'value1',
					key2: 'value2'
				}
			}
		})
		.expect(201)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.status, 201, 'successfully created event');
			t.end(err);
		});
});

test('Server - Route: /collections/:id', t => {
	t.plan(4);

	request(server.app)
		.get('/collections/daily-show')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.body.data.id, 'daily-show', 'id is set');
			t.equal(res.body.data.type, 'collection', 'type is set');
			t.equal(res.body.data.attributes.title, 'Odd Networks Daily Show', 'title is set');
			t.equal(res.body.data.relationships.entities.data.length, 3, 'collection has 3 videos');
			t.end(err);
		});
});

test('Server - Route: /collections', t => {
	t.plan(1);

	request(server.app)
		.get('/collections')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.body.data.length, 8, 'responds with an array of 4 collections');
			t.end(err);
		});
});

test('Server - Route: /videos/:id', t => {
	t.plan(4);

	request(server.app)
		.get('/videos/daily-show-video-1')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.body.data.id, 'daily-show-video-1', 'id is set');
			t.equal(res.body.data.type, 'video', 'type is set');
			t.equal(res.body.data.attributes.title, 'Daily Show: Video 1', 'title is set');
			t.equal(res.body.data.attributes.url, 'https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8', 'url is set');
			t.end(err);
		});
});

test('Server - Route: /videos', t => {
	t.plan(1);

	request(server.app)
		.get('/videos')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.body.data.length, 4, 'responds with an array of 4 videos');
			t.end(err);
		});
});

test('Server - Route: /views/:id', t => {
	t.plan(6);

	request(server.app)
		.get('/views/homepage')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.body.data.id, 'homepage', 'id is set');
			t.equal(res.body.data.type, 'view', 'type is set');
			t.equal(res.body.data.attributes.title, 'Odd Networks Homepage', 'title is set');
			t.equal(res.body.data.relationships.promotion.data.type, 'collection', 'relationship is a collection');
			t.equal(res.body.data.relationships.featuredMedia.data.type, 'collection', 'relationship is a collection');
			t.equal(res.body.data.relationships.featuredCollections.data.type, 'collection', 'relationship is a collection');
			t.end(err);
		});
});

test('Server - Route: /views', t => {
	t.plan(1);

	request(server.app)
		.get('/views')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.equal(res.body.data.length, 3, 'responds with an array of 4 views');
			t.end(err);
		});
});

test('Server - Query Params: ?include={relationship}', t => {
	t.plan(2);

	request(server.app)
		.get('/collections/daily-show?include=entities')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.ok(res.body.included, 'has included');
			t.equal(res.body.included.length, 3, 'has 3 included entities');
			t.end(err);
		});
});

'use strict';

process.env.JWT_SECRET = 'secret';

const test = require('tape');
const request = require('supertest');

let server;
const oddworks = require('../../server');
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJjaGFubmVsIjoib2RkLW5ldHdvcmtzIiwicGxhdGZvcm0iOiJhcHBsZS1pb3MiLCJzY29wZSI6WyJwbGF0Zm9ybSJdLCJpYXQiOjE0NjA5ODg5NzB9.-k0wFuWD3FFaRZ7btIad9hiJJyEIBqiR4cS8cGeGMoM';

test('CATALOG', t => {
	oddworks
		.then(result => {
			server = result;
			t.end();
		});
});

test('Route: /collections/:id', t => {
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
			t.equal(res.body.data.attributes.title, 'Odd channels Daily Show', 'title is set');
			t.equal(res.body.data.relationships.entities.data.length, 3, 'collection has 3 videos');
			t.end(err);
		});
});

test('Route: /collections', t => {
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

test('Route: /videos/:id', t => {
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

test('Route: /videos', t => {
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

test('Route: /views/:id', t => {
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
			t.equal(res.body.data.attributes.title, 'Odd channels Homepage', 'title is set');
			t.equal(res.body.data.relationships.promotion.data.type, 'collection', 'relationship is a collection');
			t.equal(res.body.data.relationships.featuredMedia.data.type, 'collection', 'relationship is a collection');
			t.equal(res.body.data.relationships.featuredCollections.data.type, 'collection', 'relationship is a collection');
			t.end(err);
		});
});

test('Route: /views', t => {
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

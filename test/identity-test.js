'use strict';

process.env.JWT_SECRET = 'secret';

const test = require('tape');
const request = require('supertest');

let server;
const oddworks = require('../server');
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJjaGFubmVsIjoib2RkLW5ldHdvcmtzIiwicGxhdGZvcm0iOiJhcHBsZS1pb3MiLCJzY29wZSI6WyJwbGF0Zm9ybSJdLCJpYXQiOjE0NjA5ODg5NzB9.-k0wFuWD3FFaRZ7btIad9hiJJyEIBqiR4cS8cGeGMoM';

test('IDENTITY', t => {
	oddworks
		.then(result => {
			server = result;
			t.end();
		});
});

test('Route: /config', t => {
	t.plan(2);

	request(server.app)
		.get('/config')
		.set('Accept', 'application/json')
		.set('x-access-token', accessToken)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			t.ok(res.body.data.attributes.features, 'has features');
			t.ok(res.body.data.attributes.views, 'has views');
			t.end(err);
		});
});

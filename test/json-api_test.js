'use strict';

process.env.JWT_SECRET = 'secret';

const test = require('tape');
const request = require('supertest');

let server;
const oddworks = require('../server');
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJjaGFubmVsIjoib2RkLW5ldHdvcmtzIiwicGxhdGZvcm0iOiJhcHBsZS1pb3MiLCJzY29wZSI6WyJwbGF0Zm9ybSJdLCJpYXQiOjE0NjA5ODg5NzB9.-k0wFuWD3FFaRZ7btIad9hiJJyEIBqiR4cS8cGeGMoM';

test('JOSN-API', t => {
	oddworks
		.then(result => {
			server = result;
			t.end();
		});
});

test('?include={relationship}', t => {
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

'use strict';

process.env.JWT_SECRET = 'secret';

const test = require('tape');
const request = require('supertest');
const utils = require('../lib/services/json-api/utils');

let server;
const testServer = require('./support/test-server');
const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJjaGFubmVsIjoib2RkLW5ldHdvcmtzIiwicGxhdGZvcm0iOiJhcHBsZS1pb3MiLCJzY29wZSI6WyJwbGF0Zm9ybSJdLCJpYXQiOjE0NjA5ODg5NzB9.-k0wFuWD3FFaRZ7btIad9hiJJyEIBqiR4cS8cGeGMoM';

test('JOSN-API', t => {
	testServer
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

test('utils.validate()', t => {
	const goodPayload = {
		id: 12345,
		type: 'some-type',
		attributes: {}
	};

	const badPayload = {
		id: 12345,
		attributes: {}
	};

	t.ok(utils.validate(goodPayload), 'goodPayload valid');
	try {
		utils.validate(badPayload);
	} catch (err) {
		t.ok(err, 'badPayload invalid');
	}
	t.end();
});

test('utils.format()', t => {
	const resource = {
		id: 12345,
		type: 'something',
		name: 'Oddworks'
	};

	const formattedResource = utils.format(resource, 'http://localhost');

	t.deepEqual(formattedResource, {
		id: 12345,
		type: 'something',
		attributes: {
			name: 'Oddworks'
		},
		relationships: {},
		links: {
			self: 'http://localhost/somethings/12345'
		},
		meta: {}
	}, 'formatted correctly');
	t.end();
});

test('utils.deformat()', t => {
	const resource = {
		id: 12345,
		type: 'something',
		attributes: {
			name: 'Oddworks'
		},
		relationships: {},
		links: {
			self: 'http://localhost/somethings/12345'
		},
		meta: {}
	};

	const deformattedResource = utils.deformat(resource);

	t.deepEqual(deformattedResource, {
		id: 12345,
		type: 'something',
		name: 'Oddworks',
		relationships: {},
		meta: {}
	}, 'deformatted correctly');
	t.end();
});

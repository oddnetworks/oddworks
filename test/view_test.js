'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var test = require('tape');
var request = require('supertest');
var seneca = require('./seneca-helper');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

test('A view as JSON', function (t) {
	t.plan(1);
	request(express)
	.get('/v2/views/2a181af0-eea5-4a11-8c5a-3c2d146657d7')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.ok(res.body.data);
		t.end(err);
	});
});

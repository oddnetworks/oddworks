'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var test = require('tape');
var request = require('supertest');
var seneca = require('./seneca-helper');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

test('A promotion as JSON', function (t) {
	request(express)
	.get('/v1/promotions/fbec8574-6eb0-4339-91db-7833d96ed8c8')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('A promotion as XML', function (t) {
	request(express)
	.get('/v1/promotions/fbec8574-6eb0-4339-91db-7833d96ed8c8')
	.set('Accept', 'application/xml')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /xml/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

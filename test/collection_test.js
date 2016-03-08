'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var test = require('tape');
var request = require('supertest');
var seneca = require('./seneca-helper');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

test('A collection as JSON', function (t) {
	request(express)
	.get('/v1/collections/0aa512b2-f171-42ed-99e0-32cbd35d36b7')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('A collection as XML', function (t) {
	request(express)
	.get('/v1/collections/0aa512b2-f171-42ed-99e0-32cbd35d36b7')
	.set('Accept', 'application/xml')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /xml/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('A collection as JSON with related videos and included', function (t) {
	request(express)
	.get('/v1/collections/0aa512b2-f171-42ed-99e0-32cbd35d36b7/relationships/entities?include=true')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

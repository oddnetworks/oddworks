'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var test = require('tape');
var request = require('supertest');
var seneca = require('./seneca-helper');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

test('Ensure the right headers', function (t) {
	request(express)
	.get('/v1/config')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.end(function (err, res) {
		t.equal(res.get('Access-Control-Allow-Origin'), '*');
		t.equal(res.get('Access-Control-Allow-Methods'), 'GET,PUT,POST,DELETE,OPTIONS');
		t.equal(res.get('Access-Control-Allow-Headers'), 'Origin, X-Access-Token, X-Requested-With, Content-Type, Accept, Cache-Control');
		t.equal(res.get('Access-Control-Max-Age'), '600');

		t.equal(res.get('Cache-Control'), 'public, max-age=600, stale-while-revalidate=604800, stale-if-error=604800');

		t.equal(res.get('X-Geo-Country-Code'), 'US');

		t.notOk(res.get('Server'));
		t.notOk(res.get('Via'));

		t.error(err, res);
		t.end();
	});
});

test('Total garbage ids', function (t) {
	request(express)
	.get('/v1/views/totalgarbarge?include=2')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(404)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('Unacceptable Accept header', function (t) {
	request(express)
	.get('/v1/promotions')
	.set('Accept', 'app/jason')
	.set('x-access-token', apiAccessToken)
	.expect(406)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('v1 matches v2 reposonse', function (t) {
	request(express)
	.get('/v1/config')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.end(function (v1Err, v1Res) {
		request(express)
			.get('/v1/config')
			.set('Accept', 'application/json')
			.set('x-access-token', apiAccessToken)
			.expect(200)
			.end(function (v2Err, v2Res) {
				t.equal(JSON.stringify(v1Res.body.data.attributes), JSON.stringify(v2Res.body.data.attributes));
				t.end(v1Err && v2Err);
			});
	});
});

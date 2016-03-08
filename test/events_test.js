'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var test = require('tape');
var request = require('supertest');
var seneca = require('./seneca-helper');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();

service.start();

test('Post event as Form Data', function (t) {
	request(express)
	.post('/v2/events')
	.set('Accept', 'application/json')
	.set('Content-Type', 'application/x-www-form-urlencoded')
	.set('x-access-token', apiAccessToken)
	.send('type=event')
	.send('attributes[organizationId]=1')
	.send('attributes[action]=app:init')
	.expect(201)
	.end(function (err, res) {
		t.equal(res.body.data.attributes.organizationId, '1');
		t.equal(res.body.data.attributes.action, 'app:init');
		t.ok(res.body.meta);
		t.ok(res.body.links);
		t.end(err);
	});
});

test('Post event as JSON', function (t) {
	request(express)
	.post('/v2/events')
	.set('Accept', 'application/json')
	.set('Content-Type', 'application/json')
	.set('x-access-token', apiAccessToken)
	.send({type: 'event', attributes: {organizationId: 1, action: 'app:init'}})
	.expect(201)
	.end(function (err, res) {
		t.equal(res.body.data.attributes.organizationId, 1);
		t.equal(res.body.data.attributes.action, 'app:init');
		t.ok(res.body.meta);
		t.ok(res.body.links);
		t.end(err);
	});
});

test('Post event denied missing required properties', function (t) {
	request(express)
	.post('/v2/events')
	.set('Accept', 'application/json')
	.set('Content-Type', 'application/json')
	.set('x-access-token', apiAccessToken)
	.send({type: 'video', attributes: {action: 'app:init'}})
	.expect(422)
	.end(function (err, res) {
		t.equal(res.body.statusCode, 422);
		t.equal(res.body.error, 'Unprocessable Entity');
		t.end(err);
	});
});

test('Post event as Form Data For Video', function (t) {
	request(express)
	.post('/v2/events')
	.set('Accept', 'application/json')
	.set('Content-Type', 'application/x-www-form-urlencoded')
	.set('x-access-token', apiAccessToken)
	.send('type=event')
	.send('attributes[organizationId]=1')
	.send('attributes[action]=video:play')
	.send('attributes[contentType]=video')
	.send('attributes[contentId]=999')
	.expect(201)
	.end(function (err, res) {
		t.equal(res.body.data.attributes.organizationId, '1');
		t.equal(res.body.data.attributes.action, 'video:play');
		t.equal(res.body.data.attributes.title, 'test');
		t.ok(res.body.meta);
		t.ok(res.body.links);
		t.end(err);
	});
});

test('Post event as Form Data For LiveStream', function (t) {
	request(express)
	.post('/v2/events')
	.set('Accept', 'application/json')
	.set('Content-Type', 'application/x-www-form-urlencoded')
	.set('x-access-token', apiAccessToken)
	.send('type=event')
	.send('attributes[organizationId]=1')
	.send('attributes[action]=video:play')
	.send('attributes[contentType]=liveStream')
	.send('attributes[contentId]=999')
	.expect(201)
	.end(function (err, res) {
		t.equal(res.body.data.attributes.organizationId, '1');
		t.equal(res.body.data.attributes.action, 'video:play');
		t.notOk(res.body.data.attributes.title);
		t.ok(res.body.meta);
		t.ok(res.body.links);
		t.end(err);
	});
});

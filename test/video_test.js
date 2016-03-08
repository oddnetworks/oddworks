'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var test = require('tape');
var request = require('supertest');
var seneca = require('./seneca-helper');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

test('A video as JSON', function (t) {
	request(express)
	.get('/v1/videos/ooyala-ARandomOddNetworksVideo')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('A video as XML', function (t) {
	request(express)
	.get('/v1/videos/ooyala-ARandomOddNetworksVideo')
	.set('Accept', 'application/xml')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /xml/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('Decorated Video with Keys', function (t) {
	request(express)
	.get('/v1/videos/a-video-with-feature-keys')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		var video = res.body.data;

		t.equal(video.id, 'a-video-with-feature-keys');
		t.equal(video.attributes.ads.provider, 'prisonsquare');
		t.equal(video.attributes.ads.url, 'http://ads.com?assetId=test&missingVar={unknown.key}');
		t.equal(video.attributes.ads.assetId, video.meta.sourceId);
		t.equal(video.attributes.player.type, 'external');
		t.equal(video.attributes.player.url, 'http://youtube.com/v/12345');
		t.error(err, res);
		t.end();
	});
});

test('Decorated Video without Keys', function (t) {
	request(express)
	.get('/v1/videos/a-video-without-feature-keys')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		var video = res.body.data;

		t.equal(video.id, 'a-video-without-feature-keys');
		t.equal(video.attributes.ads.provider, 'prisonsquare');
		t.equal(video.attributes.ads.url, 'http://prisonsquare.com/vmap.xml?mediaId={meta.sourceId}');
		t.equal(video.attributes.ads.assetId, video.id);
		t.equal(video.attributes.player.type, 'ooyala');
		t.equal(video.attributes.player.pCode, 'pee-code');
		t.equal(video.attributes.player.domain, 'ooyala.com');
		t.error(err, res);
		t.end();
	});
});

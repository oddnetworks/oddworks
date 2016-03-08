'use strict';

var _ = require('lodash');
var MockExpressRequest = require('mock-express-request');
var decorate = require('../../lib/response-decorators');
var test = require('tape');

var collectionFixture = require('../fixtures/catalog_collection/2bd223a9-7c8e-4c1d-a379-05558b841403.json');
var videoFixture = require('../fixtures/catalog_video/ooyala-ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.json');
var videoHasAds = require('../fixtures/catalog_video/has-ads.json');

var req = new MockExpressRequest({
	originalUrl: 'v1/foo/bar/baz',
	params: {
		version: 'v1'
	}
});

// Begin withLinks
test('sets body self link to full local request path', function (t) {
	t.plan(1);

	var responseFixture = {body: {data: _.cloneDeep(collectionFixture)}};
	var response;
	response = decorate.withLinks(req, responseFixture);
	t.equal(response.body.links.self, 'http://www.localhost.com/v1/foo/bar/baz');

	t.end();
});

test('sets relationship self links to full local request path', function (t) {
	t.plan(1);

	var responseFixture = {body: {data: _.cloneDeep(collectionFixture)}};
	var response;

	var originalSelfLink = responseFixture.body.data.relationships.entities.links.self;
	response = decorate.withLinks(req, responseFixture);
	t.equal(response.body.data.relationships.entities.links.self, 'http://www.localhost.com' + originalSelfLink);

	t.end();
});

test('sets included self links', function (t) {
	t.plan(2);

	var collection = _.cloneDeep(collectionFixture);
	var responseFixture = {body: {data: collection}};
	responseFixture.body.included = [];
	responseFixture.body.included.push(collection);
	var response;

	response = decorate.withLinks(req, responseFixture);
	t.equal(response.body.included[0].links.self, 'http://www.localhost.com/v1/collections/2bd223a9-7c8e-4c1d-a379-05558b841403');
	t.equal(response.body.included[0].relationships.entities.links.self, 'http://www.localhost.com/v1/collections/2bd223a9-7c8e-4c1d-a379-05558b841403/entries');

	t.end();
});
// End withLinks

// Begin withMeta
test('adds requested device to meta', function (t) {
	t.plan(1);

	var deviceName = 'ROKU_ROKU';
	var requestFixture = {identity: {device: {deviceType: deviceName}}, query: {}};
	var responseFixture = {body: {data: _.cloneDeep(collectionFixture)}};
	var response;

	response = decorate.withMeta(requestFixture, responseFixture);
	t.equal(response.body.meta.device, deviceName);

	t.end();
});

test('adds requested query params to meta', function (t) {
	t.plan(1);

	var deviceName = 'ROKU_ROKU';
	var requestFixture = {identity: {device: {deviceType: deviceName}}, query: {locale: 'en_US'}};
	var responseFixture = {body: {data: _.cloneDeep(collectionFixture)}};
	var response;

	response = decorate.withMeta(requestFixture, responseFixture);
	t.equal(response.body.meta.queryParams.locale, 'en_US');

	t.end();
});
// End withMeta

// Begin withDeviceFilter
test('filters entity attributes for respective device', function (t) {
	t.plan(1);

	var deviceName = 'ROKU_ROKU';
	var requestFixture = {identity: {device: {deviceType: deviceName}}, query: {}};
	var responseFixture = {body: {data: _.cloneDeep(collectionFixture)}};
	var response;

	response = decorate.withDeviceFilter(requestFixture, responseFixture);
	t.ok(response.body.data.attributes.hdImg);

	t.end();
});

test('filters included entity attributes for respective device', function (t) {
	t.plan(1);

	var deviceName = 'ROKU_ROKU';
	var requestFixture = {identity: {device: {deviceType: deviceName}}, query: {}};
	var responseFixture = {body: {data: _.cloneDeep(collectionFixture)}};
	responseFixture.body.included = [];
	responseFixture.body.included.push(_.cloneDeep(videoFixture));
	var response;

	response = decorate.withDeviceFilter(requestFixture, responseFixture);
	t.ok(response.body.included[0].attributes.hdImg);

	t.end();
});
// End withDeviceFilter

test('interpolate ad url with req data if it exists', function (t) {
	t.plan(1);

	var deviceName = 'ROKU_ROKU';
	var requestFixture = {identity: {device: {deviceType: deviceName}}, query: {}};
	var responseFixture = {body: {data: _.cloneDeep(videoHasAds)}};
	var response;

	response = decorate.interpolateAdUrls(requestFixture, responseFixture);
	t.equal(response.body.data.ads.url, 'http://exmaple.com?deviceType=ROKU_ROKU');

	t.end();
});

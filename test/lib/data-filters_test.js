'use strict';

var _ = require('lodash');
var test = require('tape');
var deviceConstants = require('../../lib/device-constants');
var dataFilters = require('../../lib/data-filters');

var videoFixture = require('../fixtures/catalog_video/ooyala-ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.json');
var videoHasUrlFixture = require('../fixtures/catalog_video/has-url.json');
var collectionFixture = require('../fixtures/catalog_collection/2bd223a9-7c8e-4c1d-a379-05558b841403.json');
var promotionFixture = require('../fixtures/catalog_promotion/fbec8574-6eb0-4339-91db-7833d96ed8c8.json');

test('Device Filter: ' + deviceConstants.AMAZON_FIRETV, function (t) {
	t.plan(4);

	var newVideoAttr = dataFilters[deviceConstants.AMAZON_FIRETV].video(_.cloneDeep(videoFixture.attributes));
	t.notOk(newVideoAttr.streams);
	t.equal(newVideoAttr.feedURL, 'http://example.com/player/appletv/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.m3u8');
	t.equal(newVideoAttr.feedType, 'application/x-mpegURL');
	t.equal(newVideoAttr.images.aspect16x9, 'http://image.oddworks.io/eooyala-w707/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');

	t.end();
});

test('Device Filter: ' + deviceConstants.APPLE_IOS, function (t) {
	t.plan(4);

	var newVideoAttr = dataFilters[deviceConstants.APPLE_IOS].video(_.cloneDeep(videoFixture.attributes));
	t.notOk(newVideoAttr.streams);
	t.equal(newVideoAttr.url, 'http://example.com/player/appletv/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.m3u8');

	var newVideoHasUrlAttr = dataFilters[deviceConstants.APPLE_IOS].video(_.cloneDeep(videoHasUrlFixture.attributes));
	t.notOk(newVideoHasUrlAttr.streams);
	t.equal(newVideoHasUrlAttr.url, 'http://example.com/video.m3u8');

	t.end();
});

test('Device Filter: ' + deviceConstants.GOOGLE_ANDROID, function (t) {
	t.plan(3);

	var newVideoAttr = dataFilters[deviceConstants.GOOGLE_ANDROID].video(_.cloneDeep(videoFixture.attributes));
	t.notOk(newVideoAttr.streams);
	t.equal(newVideoAttr.url, 'http://example.com/player/appletv/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.m3u8');

	// test that it filters out videos without android streams
	var badVideo = _.cloneDeep(videoFixture.attributes);
	delete badVideo.streams[4];
	badVideo.streams = _.compact(badVideo.streams);
	var shouldBeNull = dataFilters[deviceConstants.GOOGLE_ANDROID].video(badVideo);
	t.equal(shouldBeNull.url, null);

	t.end();
});

test('Device Filter: ' + deviceConstants.MICROSOFT_XBOX360, function (t) {
	t.plan(4);

	var videoFixture360 = _.cloneDeep(videoFixture);
	videoFixture360.attributes.streams = [{
		url: 'http://invalid.com'
	}];

	var newVideoAttr = dataFilters[deviceConstants.MICROSOFT_XBOX360].video(_.cloneDeep(videoFixture.attributes));
	t.notOk(newVideoAttr.streams);
	t.equal(newVideoAttr.url, 'http://ss_ooyala-s.akamaihd.net/ondemand/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/1.ism/Manifest');

	var newInvalidVideoAttr = dataFilters[deviceConstants.MICROSOFT_XBOX360].video(_.cloneDeep(videoFixture360.attributes));
	t.notOk(newInvalidVideoAttr.streams);
	t.equal(newInvalidVideoAttr.url, null);

	t.end();
});

test('Device Filter: ' + deviceConstants.ROKU_ROKU, function (t) {
	t.plan(26);

	var videoStreamUrl = 'http://example.com/player/appletv/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.m3u8';
	var liveStreamUrl = 'http://example.com/player/iphone/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE.m3u8';

	var newVideoAttr = dataFilters[deviceConstants.ROKU_ROKU].video(_.cloneDeep(videoFixture.attributes));
	t.notOk(newVideoAttr.streams);
	t.equal(newVideoAttr.url, videoStreamUrl);
	t.equal(newVideoAttr.hdImg, 'http://image.oddworks.io/eooyala-w266/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');
	t.equal(newVideoAttr.hdImg_detail, 'http://image.oddworks.io/eooyala-cfill-w261-h194/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');
	t.equal(newVideoAttr.sdImg, 'http://image.oddworks.io/eooyala-cfill-w176-h118/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');
	t.equal(newVideoAttr.sdImg_detail, 'http://image.oddworks.io/eooyala-cfill-w176-h118/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');
	t.equal(newVideoAttr.contentQuality, 'HD');
	t.equal(newVideoAttr.streamFormat, 'hls');
	t.equal(newVideoAttr.live, 'false');
	t.deepEqual(newVideoAttr.media, {streamQuality: ['HD', 'SD'], streamBitrate: ['0', '0'], streamUrl: [videoStreamUrl, videoStreamUrl]});
	t.equal(newVideoAttr.synopsis, 'Sample Video');
	t.equal(newVideoAttr.runtime, 300);

	var newLiveStreamAttr = dataFilters[deviceConstants.ROKU_ROKU].liveStream(_.cloneDeep(videoFixture.attributes));
	t.notOk(newLiveStreamAttr.streams);
	t.equal(newLiveStreamAttr.url, liveStreamUrl);
	t.equal(newLiveStreamAttr.hdImg, 'http://image.oddworks.io/eooyala-w266/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');
	t.equal(newLiveStreamAttr.sdImg, 'http://image.oddworks.io/eooyala-cfill-w176-h118/ZlOXI2djrPI66Fe1c2mDHzy7Tb8gmRVE/promo261773769.jpg');
	t.equal(newLiveStreamAttr.contentQuality, 'HD');
	t.equal(newLiveStreamAttr.streamFormat, 'hls');
	t.equal(newLiveStreamAttr.live, 'true');
	t.deepEqual(newLiveStreamAttr.media, {streamQuality: ['HD', 'SD'], streamBitrate: ['0', '0'], streamUrl: [liveStreamUrl, liveStreamUrl]});
	t.equal(newLiveStreamAttr.synopsis, 'Sample Video');
	t.notOk(newLiveStreamAttr.runtime);

	var newPromotionAttr = dataFilters[deviceConstants.ROKU_ROKU].promotion(_.cloneDeep(promotionFixture.attributes));
	t.equal(newPromotionAttr.hdImg, 'http://image.oddworks.io/w266/poker-central/promotions/1/16x9.png');
	t.equal(newPromotionAttr.sdImg, 'http://image.oddworks.io/w138/poker-central/promotions/1/16x9.png');

	var newVideoCollectionAttr = dataFilters[deviceConstants.ROKU_ROKU].collection(_.cloneDeep(collectionFixture.attributes));
	t.equal(newVideoCollectionAttr.hdImg, 'http://image.oddworks.io/eooyala-w266/kyZ2J1dTrM3ZbA7zOZyx80Gxfb00lNix/promo260129410.jpg');
	t.equal(newVideoCollectionAttr.sdImg, 'http://image.oddworks.io/eooyala-w150/kyZ2J1dTrM3ZbA7zOZyx80Gxfb00lNix/promo260129410.jpg');

	t.end();
});

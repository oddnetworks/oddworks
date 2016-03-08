'use strict';

var _ = require('lodash');
var URI = require('urijs');

function collection(attrs) {
	var data = _.clone(attrs);

	// Odd Ooyala Image Transformations
	if (data.images && data.images.aspect16x9) {
		var uri = new URI(data.images.aspect16x9);

		var ooyalaRegex = /\/(eooyala)(.*)/;
		var ooyalaResult = ooyalaRegex.exec(uri.directory());

		var edummyimageRegex = /\/(edummyimage)(.*)/;
		var edummyimageResult = edummyimageRegex.exec(uri.directory());

		if (ooyalaResult && ooyalaResult[0] && ooyalaResult[1] && ooyalaResult[2]) {
			uri.directory('/eooyala-w266' + ooyalaResult[2]);
			data.hdImg = uri.toString();
			uri.directory('/eooyala-w150' + ooyalaResult[2]);
			data.sdImg = uri.toString();
		} else if (edummyimageResult && edummyimageResult[0] && edummyimageResult[1] && edummyimageResult[2]) {
			uri.directory('/edummyimage-w266' + edummyimageResult[2]);
			data.hdImg = uri.toString();
			uri.directory('/edummyimage-w150' + edummyimageResult[2]);
			data.sdImg = uri.toString();
		}
	} else {
		data.sdImg = 'http://pokercentral-assets.surge.sh/images/sd_138_77.jpg';
		data.hdImg = 'http://pokercentral-assets.surge.sh/images/hd_266_150.jpg';
	}

	return data;
}

module.exports = {
	video: function videoFilter(attrs) {
		var data = _.clone(attrs);
		// Remove streams array, it's not needed for the client:
		var stream = _.find(data.streams, function (item) {
			return item.url.match(/appletv/) || (item.url.match(/m3u8/) && item.videoWidth.toString() === '1920');
		});

		data.url = data.url || null;
		if (stream && !data.url) {
			data.url = stream.url;
		}
		delete data.streams;

		// Odd Ooyala Image Transformations
		if (data.images && data.images.aspect16x9) {
			var uri = new URI(data.images.aspect16x9);

			var ooyalaRegex = /\/(eooyala)(.*)/;
			var ooyalaResult = ooyalaRegex.exec(uri.directory());

			var ebucketRegex = /\/(ebucket)(.*)/;
			var ebucketResult = ebucketRegex.exec(uri.directory());

			var edummyimageRegex = /\/(edummyimage)(.*)/;
			var edummyimageResult = edummyimageRegex.exec(uri.directory());

			if (ooyalaResult && ooyalaResult[0] && ooyalaResult[1] && ooyalaResult[2]) {
				uri.directory('/eooyala-w266' + ooyalaResult[2]);
				data.hdImg = uri.toString();
				uri.directory('/eooyala-cfill-w261-h194' + ooyalaResult[2]);
				data.hdImg_detail = uri.toString(); // eslint-disable-line
				uri.directory('/eooyala-cfill-w176-h118' + ooyalaResult[2]);
				data.sdImg = uri.toString();
				data.sdImg_detail = uri.toString(); // eslint-disable-line
			} else if (ebucketResult && ebucketResult[0] && ebucketResult[1] && ebucketResult[2]) {
				uri.directory('/ebucket-w266' + ebucketResult[2]);
				data.hdImg = uri.toString();
				uri.directory('/ebucket-cfill-w261-h194' + ebucketResult[2]);
				data.hdImg_detail = uri.toString(); // eslint-disable-line
				uri.directory('/ebucket-cfill-w176-h118' + ebucketResult[2]);
				data.sdImg = uri.toString();
				data.sdImg_detail = uri.toString(); // eslint-disable-line
			} else if (edummyimageResult && edummyimageResult[0] && edummyimageResult[1] && edummyimageResult[2]) {
				uri.directory('/edummyimage-w266' + edummyimageResult[2]);
				data.hdImg = uri.toString();
				uri.directory('/edummyimage-cfill-w261-h194' + edummyimageResult[2]);
				data.hdImg_detail = uri.toString(); // eslint-disable-line
				uri.directory('/edummyimage-cfill-w176-h118' + edummyimageResult[2]);
				data.sdImg = uri.toString();
				data.sdImg_detail = uri.toString(); // eslint-disable-line
			}
		} else {
			data.sdImg = 'http://pokercentral-assets.surge.sh/images/sd_138_77.jpg';
			data.hdImg = 'http://pokercentral-assets.surge.sh/images/hd_266_150.jpg';
			data.sdImg_detail = 'http://pokercentral-assets.surge.sh/images/sd_138_77.jpg'; // eslint-disable-line
			data.hdImg_detail = 'http://pokercentral-assets.surge.sh/images/hd_266_150.jpg'; // eslint-disable-line
		}

		data.contentQuality = 'HD';

		if (data.url.match(/\.mp4/)) {
			data.streamFormat = 'mp4';
		} else {
			data.streamFormat = 'hls';
		}

		data.live = 'false';

		data.media = {};
		data.media.streamQuality = ['HD', 'SD'];
		data.media.streamBitrate = ['0', '0'];
		data.media.streamUrl = [data.url, data.url];

		data.synopsis = data.description;
		data.runtime = data.duration;

		if (!data.actors) {
			data.actors = [];
		}

		return data;
	},
	liveStream: function liveStreamFilter(attrs) {
		var data = _.clone(attrs);

		// Remove streams array, it's not needed for the client:
		var stream = _.find(data.streams, function (item) {
			return item.url.match(/m3u8/);
		});

		data.url = data.url || null;
		if (stream && !data.url) {
			data.url = stream.url;
		}
		delete data.streams;

		if (data.images && data.images.aspect16x9) {
			var uri = new URI(data.images.aspect16x9);

			var ooyalaRegex = /\/(eooyala)(.*)/;
			var ooyalaResult = ooyalaRegex.exec(uri.directory());

			var ebucketRegex = /\/(ebucket)(.*)/;
			var ebucketResult = ebucketRegex.exec(uri.directory());

			var edummyimageRegex = /\/(edummyimage)(.*)/;
			var edummyimageResult = edummyimageRegex.exec(uri.directory());

			if (ooyalaResult && ooyalaResult[0] && ooyalaResult[1] && ooyalaResult[2]) {
				uri.directory('/eooyala-w266' + ooyalaResult[2]);
				data.hdImg = uri.toString();
				uri.directory('/eooyala-cfill-w261-h194' + ooyalaResult[2]);
				data.hdImg_detail = uri.toString(); // eslint-disable-line
				uri.directory('/eooyala-cfill-w176-h118' + ooyalaResult[2]);
				data.sdImg = uri.toString();
				data.sdImg_detail = uri.toString(); // eslint-disable-line
			} else if (ebucketResult && ebucketResult[0] && ebucketResult[1] && ebucketResult[2]) {
				uri.directory('/ebucket-w266' + ebucketResult[2]);
				data.hdImg = uri.toString();
				uri.directory('/ebucket-cfill-w261-h194' + ebucketResult[2]);
				data.hdImg_detail = uri.toString(); // eslint-disable-line
				uri.directory('/ebucket-cfill-w176-h118' + ebucketResult[2]);
				data.sdImg = uri.toString();
				data.sdImg_detail = uri.toString(); // eslint-disable-line
			} else if (edummyimageResult && edummyimageResult[0] && edummyimageResult[1] && edummyimageResult[2]) {
				uri.directory('/edummyimage-w266' + edummyimageResult[2]);
				data.hdImg = uri.toString();
				uri.directory('/edummyimage-cfill-w261-h194' + edummyimageResult[2]);
				data.hdImg_detail = uri.toString(); // eslint-disable-line
				uri.directory('/edummyimage-cfill-w176-h118' + edummyimageResult[2]);
				data.sdImg = uri.toString();
				data.sdImg_detail = uri.toString(); // eslint-disable-line
			}
		} else {
			data.sdImg = 'http://pokercentral-assets.surge.sh/images/sd_138_77.jpg';
			data.hdImg = 'http://pokercentral-assets.surge.sh/images/hd_266_150.jpg';
		}

		data.contentQuality = 'HD';

		if (data.url.match(/\.mp4/)) {
			data.streamFormat = 'mp4';
		} else {
			data.streamFormat = 'hls';
		}

		data.live = 'true';

		data.media = {};
		data.media.streamQuality = ['HD', 'SD'];
		data.media.streamBitrate = ['0', '0'];
		data.media.streamUrl = [data.url, data.url];

		data.synopsis = data.description;

		return data;
	},
	promotion: function promotionFilter(attrs) {
		var data = _.clone(attrs);

		if (data.images && data.images.aspect16x9) {
			var uri = new URI(data.images.aspect16x9);
			var uriDir = uri.directory();
			uri.directory('/w266' + uriDir);
			data.hdImg = uri.toString();
			uri.directory('/w138' + uriDir);
			data.sdImg = uri.toString();
		} else {
			data.sdImg = 'http://pokercentral-assets.surge.sh/images/sd_138_77.jpg';
			data.hdImg = 'http://pokercentral-assets.surge.sh/images/hd_266_150.jpg';
		}

		return data;
	},
	videoCollection: collection,
	collection: collection
};

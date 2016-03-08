'use strict';

var URI = require('urijs');
var _ = require('lodash');

function videoFilter(attrs) {
	var images = {};
	var data = _.clone(attrs);

	// add/remove/modify attributes of the entity loaded from data/*.json
	// we should only ever need to modify the attributes, nothing else

	// Remove streams array, it's not needed for the client:
	var stream = _.find(data.streams, function findProperStream(s) {
		return s.url.match(/appletv/) || (s.url.match(/m3u8/) && s.videoWidth.toString() === '1920');
	});

	// HACK: The framework we're currently using for Amazon doesn't like URL.
	//			 We should probably do this clientside, as we don't want to guarantee
	//			 this framework will always be used.
	data.feedURL = stream.url;
	data.feedType = 'application/x-mpegURL';
	delete data.streams;

	if (data.images && data.images.aspect16x9) {
		var uri = new URI(data.images.aspect16x9);
		var re = /\/(eooyala)(.*)/;
		var result = re.exec(uri.directory());
		if (result && result[0] && result[1] && result[2]) {
			uri.directory('/eooyala-w707' + result[2]);
			images.aspect16x9 = data.images.aspect16x9 = uri.toString();
		}
	}

	delete data.images;
	data.images = images;

	return data;
}

function queryFilter(attrs) {
	var data = _.clone(attrs);

	return data;
}

module.exports = {
	video: videoFilter,
	liveStream: videoFilter,
	query: queryFilter
};

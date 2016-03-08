'use strict';

var _ = require('lodash');

function videoFilter(attrs) {
	var data = _.clone(attrs);
	// add/remove/modify attributes of the entity loaded from data/*.json
	// we should only ever need to modify the attributes, nothing else

	// Remove streams array, it's not needed for the client:
	var stream = _.find(data.streams, function findProperStream(s) {
		return s.url.match(/appletv/) || (s.url.match(/m3u8/) && s.videoWidth.toString() === '1920');
	});
	delete data.streams;

	data.url = data.url || null;
	if (stream) {
		data.url = stream.url;
	}

	return data;
}

module.exports = {
	video: videoFilter,
	liveStream: videoFilter
};

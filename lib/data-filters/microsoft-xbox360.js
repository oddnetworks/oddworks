'use strict';

var _ = require('lodash');

function videoFilter(attrs) {
	// Find the Smooth Streaming H.264/AAC url
	var stream = _.find(attrs.streams, function find(stream) {
		return _.endsWith(stream.url, 'Manifest');
	});
	delete attrs.streams;

	attrs.url = attrs.url || null;
	if (stream) {
		attrs.url = stream.url;
	}

	return attrs;
}

module.exports = {
	video: videoFilter,
	liveStream: videoFilter
};

'use strict';

var _ = require('lodash');
var URI = require('urijs');

function collection(attrs) {
	// Rating
	attrs.contentRating = 'Microsoft:16';

	return attrs;
}

module.exports = {
	video: function videoFilter(attrs) {
		var data = _.clone(attrs);
		if (data.streams) {
			// add/remove/modify attributes of the entity loaded from data/*.json
			// we should only ever need to modify the attributes, nothing else

			// Remove streams array, it's not needed for the client:
			var stream = _.find(data.streams, function (item) {
				return item.url.match(/appletv/) || (item.url.match(/m3u8/) && item.videoWidth.toString() === '1920');
			});

			data.url = data.url || null;
			if (stream) {
				data.url = stream.url;
			}

			// UNHACK
			// data.url = stream.url;

			delete data.streams;

			// Odd Ooyala Image Transformations
			if (data.images && data.images.aspect16x9) {
				var uri = new URI(data.images.aspect16x9);
				var re = /\/(eooyala)(.*)/;
				var result = re.exec(uri.directory());
				if (result && result[0] && result[1] && result[2]) {
					uri.directory('/eooyala-w754' + result[2]);
					data.images.aspect16x9 = uri.toString();
				}
			}
		}

		// Rating
		data.contentRating = 'Microsoft:16';

		return data;
	},
	liveStream: function liveStreamFilter(attrs) {
		// Remove streams array, it's not needed for the client:
		if (attrs.streams) {
			var stream = _.find(attrs.streams, function (item) {
				return item.url.match(/m3u8/);
			});

			attrs.url = attrs.url || null;
			if (stream) {
				attrs.url = stream.url;
			}

			delete attrs.streams;
		}

		// Rating
		attrs.contentRating = 'Microsoft:16';

		return attrs;
	},
	videoCollection: collection,
	collection: collection

};

const Mixpanel = require('mixpanel');

function Analyzer(options) {
	this.options = options || {};

	try {
		this.instance = Mixpanel.init(this.options.apiKey);
	} catch (err) {
		return null;
	}

	return this;
}

module.exports = options => {
	return new Analyzer(options);
};

Analyzer.prototype = {
	prepare(payload) {
		const statsPackage = {
			/*eslint-disable */
			'distinct_id': payload.distinctId,
			'platform_id': payload.platform,
			'channel_id': payload.channel,
			'content_type': payload.contentType,
			'content_id': payload.contentId,
			'geo_id': payload.geoId,
			'ip': payload.ip,
			'user_agent': payload.userAgent,
			'x_user_agent': payload.xUserAgent,
			'Video Title': payload.title
			/*eslint-enable */
		};

		if (payload.elapsed) {
			statsPackage['Time Watched'] = payload.elapsed;
		}
		if (payload.category) {
			statsPackage.Category = payload.category;
		}
		if (payload.duration && payload.duration !== 0) {
			statsPackage.duration = parseInt(payload.duration, 10);
		}
		if (statsPackage.duration && statsPackage.duration !== 0 && payload.elapsed && payload.contentType === 'video') {
			statsPackage['Completion Percentage'] = getPercentage(parseInt(payload.elapsed, 10) / statsPackage.duration);
		}
		return statsPackage;
	},

	send(payload) {
		payload = this.prepare(payload);
		if (payload) {
			this.instance.track(payload.action, payload);

			// Only set this if it doesn't exist
			this.instance.people.set_once(payload.ip, {
				/*eslint-disable */
				$first_name: 'Anonymous',
				ip: payload.ip
				/*eslint-enable */
			});
		}
	}
};

// rounds up to nearest multiple of 5 and returns in % form
function getPercentage(toRound) {
	toRound *= 100;
	var toReturn = Math.ceil(toRound / 5) * 5;
	if (toReturn > 100) {
		toReturn = 100;
	}
	return toReturn;
}

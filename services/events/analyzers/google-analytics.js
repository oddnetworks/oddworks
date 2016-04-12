'use strict';

const ua = require('universal-analytics');

const Analyzer = exports = module.exports = options => {
	this.options = options || {};

	if (!this.options.trackingId) {
		return null;
	}

	return this;
};

Analyzer.prototype = {
	prepare(payload) {
		const visitor = ua(this.options.trackingId, payload.sessionId, {https: true, strictCidFormat: false});
		const action = payload.action.split(':');
		let screen;

		if (payload.contentType && payload.contentId) {
			screen = payload.contentType + '-' + payload.contentId;
		}

		var params = {
			t: 'event',
			av: payload.deviceType,
			an: payload.organization,
			ds: 'app',
			ec: action[0],
			ea: action[1],
			cd: screen,
			geoid: payload.geoId,
			uip: payload.ip,
			ua: payload.userAgent
		};

		return {visitor, params};
	},

	send(payload) {
		payload = this.prepare(payload);

		if (payload) {
			payload.visitor.event(payload.params);
		}
	}
};

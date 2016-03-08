'use strict';

var _ = require('lodash');
var send = require('../lib/response-send.js');

module.exports = {
	get: function (req, res, next) {
		req.data = {
			type: 'config',
			features: _.get(req, 'identity.organization.features'),
			views: _.get(req, 'identity.device.views')
		};

		// Override org feature ads with device
		if (_.has(req, 'identity.device.features.ads')) {
			var organizationAds = _.get(req, 'identity.organization.features.ads');
			var deviceAds = _.get(req, 'identity.device.features.ads');
			var mergedAds = _.merge({}, organizationAds, deviceAds);

			_.set(req, 'data.features.ads', mergedAds);
		}

		return send(null, req, res, next);
	}
};

'use strict';

var _ = require('lodash');

module.exports = {
	SwapPCLiveStreamForIntl: function (req, res) {
		if (req.identity.network.id === 'poker-central' && req.params.entityType && req.params.entityType === 'views' && res.get('X-Geo-Country-Code') !== 'US') {
			_.mapValues(req.data.relationships, function (relationship) {
				if (_.isArray(relationship.data)) {
					_.map(relationship.data, function (entity) {
						if (entity.type === 'liveStream' && entity.id === 'dd4280d7-b587-420c-8546-fd731d60a926') {
							entity.id = 'f17229cf-5e63-40d3-9571-53e8f5849ac1';
						}
						return entity;
					});
				} else {
					/* eslint-disable */
					if (relationship.data.type === 'liveStream' && relationship.data.id === 'dd4280d7-b587-420c-8546-fd731d60a926') {
					/* eslint-ensable */
						relationship.data.id = 'f17229cf-5e63-40d3-9571-53e8f5849ac1';
					}
				}
				return relationship;
			});
		}
		return;
	},

	LimitPCXboxOneSearchResults: function(req, res) {
		if (req.identity.network.id === 'poker-central' && req.identity.device.deviceType === 'MICROSOFT_XBOXONE') {
			req.data.data = req.data.data.slice(0, 12);
		}
		return;
	},

	AttachOldRokuAdUrl: function(req, res) {
		if (req.identity.network.id === 'poker-central' && req.identity.device.deviceType === 'ROKU_ROKU') {
			req.data.ads = {
				vast: 'http://ad4.liverail.com/?LR_PUBLISHER_ID=17424&LR_SCHEMA=vast2&LR_FORMAT=application/json;video/mp4&LR_OS=roku&LR_MAKE=roku&LR_ADTYPE=3&LR_AUTOPLAY=0&LR_CONTENT=1&LR_PARTNERS=831930&LR_TAGS=roku2&LR_DISABLE_UDS=1&LR_IDFA_FLAG=1&LR_IDFA=ROKU_ADS_TRACKING_ID'
			};
		}

		return;
	}
};

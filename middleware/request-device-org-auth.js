'use strict';

var _ = require('lodash');
var boom = require('boom');
var Promise = require('bluebird');

module.exports = function requestDeviceOrgAuth(req, res, next) {
	var seneca = req.app.get('seneca');
	var act = Promise.promisify(seneca.act, seneca);
	req.identity = {};

	if (_.includes(req.accessToken.scope, 'device') || _.includes(req.accessToken.scope, 'devicelink')) {
		act({role: 'identity', cmd: 'fetchDevice', id: req.accessToken.deviceID})
			.then(function (device) {
				req.identity.device = device;

				return act({role: 'identity', cmd: 'fetchOrganization', id: device.organization});
			})
			.then(function (organization) {
				req.identity.organization = _.omit(organization, ['key', 'secret']);
				next();
			})
			.catch(function (err) {
				if (err) {
					next(boom.unauthorized('Invalid Organization and/or Device'));
				}
			});
	} else {
		next(boom.unauthorized('Invalid AccessToken Scope'));
	}
};

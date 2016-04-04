'use strict';

var requestAuth = require('../../middleware/request-device-org-auth');
var seneca = require('../seneca-helper')();
var express = require('express');

var app = express();
app.set('seneca', seneca);

var test = require('tape');

test('Middleware: request-device-org-auth', function (t) {
	t.plan(6);

	var req = {
		app: app,
		accessToken: {
			deviceID: '6db3849b-8708-48e9-88f2-92de33390e8f',
			scope: ['device']
		}
	};

	requestAuth(req, {}, function () {
		t.equal(req.identity.device.deviceType, 'MICROSOFT_XBOX360');
		t.ok(req.identity.device.views);
		t.equal(req.identity.network.id, 'odd-networks');
		t.ok(req.identity.network.features);
		t.notOk(req.identity.network.key);
		t.notOk(req.identity.network.secret);
		t.end();
	});
});

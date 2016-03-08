'use strict';

var requestUserEntitlement = require('../../middleware/request-user-entitlement');
var seneca = require('../seneca-helper')();
var express = require('express');

var app = express();
app.set('seneca', seneca);

var test = require('tape');

test('Middleware: request-user-entitlement - with valid user entitlementCredentials - sets req.identity.user.userEntitlements', function (t) {
	t.plan(2);

	var req = {
		app: app,
		organization: 'poker-central',
		identity: {
			user: {
				deviceUserProfile: {
					entitlementCredentials: {uid: '12345'}
				}
			}
		}
	};

	requestUserEntitlement(req, {}, function () {
		t.ok(req.identity.user.userEntitlements);
		t.equal(req.identity.user.userEntitlements[0], 'Subscription');
		t.end();
	});
});

test('Middleware: request-user-entitlement - with valid user entitlementCredentials and empty entitlement response - throws 401 unauthorized', function (t) {
	t.plan(3);

	var req = {
		app: app,
		organization: 'poker-central',
		identity: {
			user: {
				deviceUserProfile: {
					entitlementCredentials: {uid: '67890'}
				}
			}
		}
	};

	requestUserEntitlement(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 401);
		t.notOk(req.identity.user.userEntitlements);
		t.end();
	});
});

test('Middleware: request-user-entitlement - with invalid user entitlementCredentials - throws 401 unauthorized', function (t) {
	t.plan(3);

	var req = {
		app: app,
		organization: 'poker-central',
		identity: {
			user: {
				deviceUserProfile: {
					entitlementCredentials: {uid: '98765'}
				}
			}
		}
	};

	requestUserEntitlement(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 401);
		t.notOk(req.identity.user.userEntitlements);
		t.end();
	});
});

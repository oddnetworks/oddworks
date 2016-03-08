'use strict';

var test = require('tape');
var seneca = require('../seneca-helper')();
var express = require('express');
var requestUserAuth = require('../../middleware/request-user-auth');

var app = express();
app.set('seneca', seneca);

test('Middleware: request-user-auth - with authentication required and valid AuthorizationToken - returns respective deviceUserProfile', function (t) {
	t.plan(2);

	var req = {
		app: app,
		params: {
			entityId: '2'
		},
		identity: {
			organization: {
				features: {authentication: {enabled: true}}
			},
			device: {
				views: {splash: '1'}
			}
		},
		authorizationToken: {jti: '912efb97-885a-497e-86f8-5bddeb1e5d9c', scope: ['user']}
	};

	requestUserAuth(req, {}, function () {
		t.ok(req.identity.user.deviceUserProfile);
		t.equal(req.identity.user.deviceUserProfile.id, '56099956dcf43b1100a26fc9');
		t.end();
	});
});

test('Middleware: request-user-auth - with authentication required and missing AuthorizationToken - does not set user identity - lets request pass without error', function (t) {
	t.plan(2);

	var req = {
		app: app,
		params: {
			entityId: '2'
		},
		identity: {
			organization: {
				features: {authentication: {enabled: true}}
			},
			device: {
				views: {splash: '1'}
			}
		}
	};

	requestUserAuth(req, {}, function (err) {
		t.notOk(err);
		t.notOk(req.identity.user);
		t.end();
	});
});

test('Middleware: request-user-auth - with authentication required and non-user scope in AuthorizationToken - throws unauthorized', function (t) {
	t.plan(3);

	var req = {
		app: app,
		params: {
			entityId: '2'
		},
		identity: {
			organization: {
				features: {authentication: {enabled: true}}
			},
			device: {
				views: {splash: '1'}
			}
		},
		authorizationToken: {jti: '912efb97-885a-497e-86f8-5bddeb1e5d9c', scope: ['bad_scope']}
	};

	requestUserAuth(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 401);
		t.notOk(req.identity.user);
		t.end();
	});
});

test('Middleware: request-user-auth - with authentication required and invalid AuthorizationToken jti - throws unauthorized', function (t) {
	t.plan(3);

	var req = {
		app: app,
		params: {
			entityId: '2'
		},
		identity: {
			organization: {
				features: {authentication: {enabled: true}}
			},
			device: {
				views: {splash: '1'}
			}
		},
		authorizationToken: {jti: 'invalid_jti', scope: ['bad_scope']}
	};

	requestUserAuth(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 401);
		t.notOk(req.identity.user);
		t.end();
	});
});

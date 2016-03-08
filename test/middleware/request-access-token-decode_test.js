'use strict';

var requestAccessTokenDecode = require('../../middleware/request-access-token-decode');
var seneca = require('../seneca-helper')();
var express = require('express');

var MockExpressRequest = require('mock-express-request');

var app = express();
app.set('seneca', seneca);

var test = require('tape');

var rokuDeviceToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJkZXZpY2VJRCI6ImFjN2MzM2Y0LTM0ZjUtNDIxYy1hNjhmLTY0MzhiYzg4ZGVmZiIsInNjb3BlIjpbImRldmljZSJdLCJpYXQiOjE0Mzk5Mjg3MjF9.3TwLDblKEiPh7hA1kBJcPVKkms3yMdrWJMy6d8Uh3-8';
// {
//	 typ: "JWT",
//	 alg: "HS256"
// }.
// {
//	 version: 1,
//	 deviceID: "ac7c33f4-34f5-421c-a68f-6438bc88deff",
//	 scope: [
//		 "device"
//	 ],
//	 iat: 1439928721
// }.
// [signature]

var rokuUserToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJkZXZpY2VJRCI6ImFjN2MzM2Y0LTM0ZjUtNDIxYy1hNjhmLTY0MzhiYzg4ZGVmZiIsInNjb3BlIjpbInVzZXIiXSwidWlkIjoiMTIzNDUiLCJlbnRpdGxlbWVudHMiOlt7InVzZXJJRCI6IjEyMzQ1In1dLCJqdGkiOiJhYTZmYWU2Yi04MTQ1LTQ4ZjMtOTk5Ny0yY2U2MzQ2YzQ3ZmQiLCJpYXQiOjE0NDM2NTY3ODR9.G1k15IDHoETpkRz2QYD9QYY8_eIRP3NKyjtUwONCoCs';
// {
//	typ: "JWT",
//	alg: "HS256"
// }.
// {
//	version: 1,
//	deviceID: "ac7c33f4-34f5-421c-a68f-6438bc88deff",
//	scope: [
//	 "user"
//	],
//	uid: "12345",
//	entitlements: [
//	 {
//		userID: "12345"
//	 }
//	],
//	jti: "aa6fae6b-8145-48f3-9997-2ce6346c47fd",
//	iat: 1443656784
// }.
// [signature]

var xboxOneUserToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJkZXZpY2VJRCI6ImUyOGI0ZjFjLTgyZTItNDYwZS04NjgxLTY2Y2ZmMGFjZjkwZiIsInNjb3BlIjpbInVzZXIiXSwidWlkIjoiMTIzNDUiLCJlbnRpdGxlbWVudHMiOlt7InVzZXJJRCI6IjEyMzQ1In1dLCJqdGkiOiJhYTZmYWU2Yi04MTQ1LTQ4ZjMtOTk5Ny0yY2U2MzQ2YzQ3ZmQiLCJpYXQiOjE0NDM2NTY3ODR9.dsnPTrT9u5F4rAj1_I99nzNSSbbV4URunNWynekqF0Y';
// {
//	typ: "JWT",
//	alg: "HS256"
// }.
// {
//	version: 1,
//	deviceID: "e28b4f1c-82e2-460e-8681-66cff0acf90f",
//	scope: [
//	 "user"
//	],
//	uid: "12345",
//	entitlements: [
//	 {
// userID: "12345"
// }
//	],
//	jti: "aa6fae6b-8145-48f3-9997-2ce6346c47fd",
//	iat: 1443656784
// }.
// [signature]

test('Middleware: request-access-token-decode - with valid jwt for device - sets access token', function (t) {
	t.plan(1);

	var req = new MockExpressRequest({
		headers: {
			'x-access-token': rokuDeviceToken
		}
	});

	requestAccessTokenDecode(req, {}, function (err) {
		t.ok(req.accessToken);
		t.end(err);
	});
});

test('Middleware: request-access-token-decode - with valid jwt for org/device/user - sets access/authorization tokens', function (t) {
	t.plan(2);

	var req = new MockExpressRequest({
		headers: {
			'x-access-token': rokuDeviceToken,
			'Authorization': 'Bearer ' + rokuUserToken
		}
	});

	requestAccessTokenDecode(req, {}, function (err) {
		t.ok(req.accessToken);
		t.ok(req.authorizationToken);
		t.end(err);
	});
});

test('Middleware: request-access-token-decode - with missing jwt for device - throws bad request', function (t) {
	t.plan(2);

	var req = new MockExpressRequest({
		headers: {
			Authorization: 'Bearer ' + rokuUserToken
		}
	});

	requestAccessTokenDecode(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 400);
		t.end();
	});
});

test('Middleware: request-access-token-decode - with mismatched jwt for org/device/user - throws bad request', function (t) {
	t.plan(2);

	var req = new MockExpressRequest({
		headers: {
			'x-access-token': rokuDeviceToken,
			'Authorization': 'Bearer ' + xboxOneUserToken
		}
	});

	requestAccessTokenDecode(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 400);
		t.end();
	});
});

test('Middleware: request-access-token-decode - with invalid jwt for device - throws bad request', function (t) {
	t.plan(2);

	var req = new MockExpressRequest({
		headers: {
			'x-access-token': 'bad_token'
		}
	});

	requestAccessTokenDecode(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 400);
		t.end();
	});
});

test('Middleware: request-access-token-decode - with valid jwt for device and invalid jwt for user - throws bad request', function (t) {
	t.plan(2);

	var req = new MockExpressRequest({
		/* eslint-disable */
		headers: {
			'x-access-token': rokuDeviceToken,
			Authorization: 'Bearer bad_token'
		}
		/* eslint-enable */
	});

	requestAccessTokenDecode(req, {}, function (err) {
		t.ok(err);
		t.equal(err.output.statusCode, 400);
		t.end();
	});
});

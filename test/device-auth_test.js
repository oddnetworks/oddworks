'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token_device_link.json').encoded_jwt;

var seneca = require('./seneca-helper');
var test = require('tape');
var request = require('supertest');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

seneca = seneca();

var DatabaseError = function (message) {
	this.message = message;
};
DatabaseError.prototype = new Error();
DatabaseError.prototype.name = 'DatabaseError';

var DeviceUserProfileError = function (message) {
	this.message = message;
};
DeviceUserProfileError.prototype = new Error();
DeviceUserProfileError.prototype.name = 'DeviceUserProfileError';

test('listUserDevices - A DatabaseError returns a 500', function (t) {
	seneca.add({role: 'device-auth', cmd: 'listUserDevices'}, function (args, done) {
		done(new DatabaseError());
	});

	request(express)
	.get('/v1/auth/user/1234/devices')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(500)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('listUserDevices - A DeviceUserProfileError returns a 404', function (t) {
	seneca.add({role: 'device-auth', cmd: 'listUserDevices'}, function (args, done) {
		done(new DeviceUserProfileError());
	});

	request(express)
	.get('/v1/auth/user/1234/devices')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(404)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('listUserDevices - A successful response returns a 200', function (t) {
	seneca.add({role: 'device-auth', cmd: 'listUserDevices'}, function (args, done) {
		done(null, [{_id: 1, clientUserID: 1234, device: 'ROKU'}, {_id: 2, clientUserID: 1234, device: 'APPLE_IOS'}]);
	});

	request(express)
	.get('/v1/auth/user/1234/devices')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('removeUserDevice - A DatabaseError returns a 500', function (t) {
	seneca.add({role: 'device-auth', cmd: 'removeUserDevice'}, function (args, done) {
		done(new DatabaseError());
	});

	request(express)
	.delete('/v1/auth/user/1234/devices/1')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(500)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('removeUserDevice - A DeviceUserProfileError returns a 404', function (t) {
	seneca.add({role: 'device-auth', cmd: 'removeUserDevice'}, function (args, done) {
		done(new DeviceUserProfileError());
	});

	request(express)
	.delete('/v1/auth/user/1234/devices/1')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(404)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('removeUserDevice - A successful response returns a 200', function (t) {
	seneca.add({role: 'device-auth', cmd: 'removeUserDevice'}, function (args, done) {
		done(null, [{_id: 1, clientUserID: 1234, device: 'ROKU'}]);
	});

	request(express)
	.delete('/v1/auth/user/1234/devices/1')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

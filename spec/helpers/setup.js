/* global beforeAll afterAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';

const	MockServerResponse = require('mock-express-response/node_modules/mock-res');

const support = require('../support/');

const SETUP_TIMEOUT = 5000;

MockServerResponse.prototype._getString = function () {
	const buffs = this._readableState.buffer;

	if (buffs.constructor.name === 'BufferList') {
		return buffs.join();
	}

	return buffs.toString();
};

MockServerResponse.prototype._getJSON = function () {
	return JSON.parse(this._getString());
};

beforeAll(function (done) {
	this.createBus = support.createBus;
	done();
}, SETUP_TIMEOUT);

afterAll(function (done) {
	done();
});

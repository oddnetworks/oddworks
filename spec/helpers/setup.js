/* global beforeAll afterAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';

let MockServerResponse;
try {
	MockServerResponse = require('mock-express-response/node_modules/mock-res');
} catch (err) {
	if (/Cannot find module/.test(err.message)) {
		// For some reason, this is how MockServerResponse is required on the CI
		MockServerResponse = require('mock-res'); // eslint-disable-line import/no-extraneous-dependencies
	} else {
		throw err;
	}
}

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

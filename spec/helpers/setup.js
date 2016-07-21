/* global beforeAll afterAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';

const MockServerResponse = require('mock-express-response/node_modules/mock-res');
const support = require('../support/');

const SETUP_TIMEOUT = 5000;

MockServerResponse.prototype._getString = function () {
	const buffs = this._readableState.buffer;

	if (Array.isArray(buffs)) {
		return buffs.map(buff => {
			return buff.toString();
		}).join('');
	}

	return buffs.toString();
};

beforeAll(function (done) {
	this.createBus = support.createBus;
	done();
}, SETUP_TIMEOUT);

afterAll(function (done) {
	done();
});

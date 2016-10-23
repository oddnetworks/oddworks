/* global beforeAll afterAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';
const support = require('../support/');

const SETUP_TIMEOUT = 5000;

beforeAll(function (done) {
	this.createBus = support.createBus;
	this.handleError = support.handleError;
	done();
}, SETUP_TIMEOUT);

afterAll(function (done) {
	done();
});

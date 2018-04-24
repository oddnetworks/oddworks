/* global beforeAll afterAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';
const support = require('../support/');

const SETUP_TIMEOUT = 30000;
const JASMINE_TIMEOUT = 30000;
const ORIGINAL_JASMINE_TIMEOUT = jasmine.DEFAULT_TIMEOUT_INTERVAL; // eslint-disable-line no-undef

beforeAll(function (done) {
	jasmine.DEFAULT_TIMEOUT_INTERVAL = JASMINE_TIMEOUT; // eslint-disable-line no-undef

	this.createBus = support.createBus;
	this.handleError = support.handleError;
	done();
}, SETUP_TIMEOUT);

afterAll(function (done) {
	jasmine.DEFAULT_TIMEOUT_INTERVAL = ORIGINAL_JASMINE_TIMEOUT; // eslint-disable-line no-undef
	done();
});

/* global beforeAll afterAll */
/* eslint prefer-arrow-callback: 0 */
'use strict';
const support = require('../support/');

beforeAll(function () {
	console.log('jasmine test beforeAll setup');
	this.createBus = support.createBus;
	this.handleError = support.handleError;
	console.log('jasmine test beforeAll setup complete');
});

afterAll(function () {
	console.log();
	console.log('jasmine test afterAll teardown');
	console.log('jasmine test afterAll teardown complete');
});

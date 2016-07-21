/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const MockExpressResponse = require('mock-express-response');

const errorHandler = require('../../lib/middleware/error-handler');

describe('Middleware: Error Handler', () => {
	// Just a dummy object for reference
	const REQ = {REQ: 'request'};

	describe('when error is a plain Object', () => {
		let RES = null;
		const ERR = {};

		beforeAll(function () {
			RES = new MockExpressResponse();
			errorHandler()(ERR, REQ, RES);
		});

		it('sets statusCode === 500 by default', function () {
			expect(RES.statusCode).toBe(500);
		});

		it('casts error to an Array', function () {
			const body = RES._getJSON();
			expect(Array.isArray(body.errors)).toBeTruthy();
			expect(body.errors.length).toBe(1);
		});

		it('adds default error properties', function () {
			const body = RES._getJSON();
			const error = body.errors[0];
			expect(error.status).toBe('500');
			expect(error.title).toBe('Internal Server Error');
			expect(error.detail).toBeUndefined();
			expect(error.source).toBeUndefined();
			expect(error.meta).toBeUndefined();
		});
	});

	describe('when errors is an Array', () => {
		let RES = null;
		const ERR = [{}, new Error('TEST')];

		beforeAll(function () {
			RES = new MockExpressResponse();
			errorHandler()(ERR, REQ, RES);
		});

		it('includes .errors as an Array', function () {
			const body = RES._getJSON();
			expect(Array.isArray(body.errors)).toBeTruthy();
			expect(body.errors.length).toBe(2);
		});

		it('formats each error Object', function () {
			const body = RES._getJSON();
			const errors = body.errors;
			expect(errors[0].status).toBe('500');
			expect(errors[0].title).toBe('Internal Server Error');
			expect(errors[0].detail).toBeUndefined();
			expect(errors[0].source).toBeUndefined();
			expect(errors[0].meta).toBeUndefined();
			expect(errors[1].status).toBe('500');
			expect(errors[1].title).toBe('Error');
			expect(errors[1].detail).toBe('TEST');
			expect(errors[1].source).toBeUndefined();
			expect(errors[1].meta).toBeUndefined();
		});
	});
});

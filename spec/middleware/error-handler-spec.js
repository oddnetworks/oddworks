/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Boom = require('boom');
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

	describe('with native Error', function () {
		let RES = null;
		const ERR = new Error('NATIVE_ERROR_MESSAGE');

		beforeAll(function () {
			RES = new MockExpressResponse();
			errorHandler()(ERR, REQ, RES);
		});

		it('sets statusCode === 500', function () {
			expect(RES.statusCode).toBe(500);
		});

		it('adds Boom error properties', function () {
			const body = RES._getJSON();
			const error = body.errors[0];
			expect(error.status).toBe('500');
			expect(error.title).toBe('Error');
			expect(error.detail).toBe('NATIVE_ERROR_MESSAGE');
		});
	});

	describe('with Boom Error', function () {
		let RES = null;
		const ERR = Boom.badData('Channel ID is required');

		beforeAll(function () {
			RES = new MockExpressResponse();
			errorHandler()(ERR, REQ, RES);
		});

		it('sets statusCode === 422', function () {
			expect(RES.statusCode).toBe(422);
		});

		it('adds Boom error properties', function () {
			const body = RES._getJSON();
			const error = body.errors[0];
			expect(error.status).toBe('422');
			expect(error.title).toBe('Unprocessable Entity');
			expect(error.detail).toBe('Channel ID is required');
		});
	});

	describe('with "id" "links" "code" "source" "meta"', () => {
		let RES = null;

		const LINKS = {about: 'http://about'};
		const SOURCE = {pointer: '/data/attributes/username'};
		const META = {META: 'META'};

		const ERR = Boom.unauthorized('Username not found');
		ERR.id = 'really-long-uuid';
		ERR.links = LINKS;
		ERR.code = 'USERNAME_NOT_FOUND';
		ERR.source = SOURCE;
		ERR.meta = META;

		beforeAll(function () {
			RES = new MockExpressResponse();
			errorHandler()(ERR, REQ, RES);
		});

		it('adds default error properties', function () {
			const body = RES._getJSON();
			const error = body.errors[0];
			expect(error.id).toBe('really-long-uuid');
			expect(error.links.about).toBe('http://about');
			expect(error.status).toBe('401');
			expect(error.code).toBe('USERNAME_NOT_FOUND');
			expect(error.title).toBe('Unauthorized');
			expect(error.detail).toBe('Username not found');
			expect(error.source.pointer).toBe('/data/attributes/username');
			expect(error.meta.META).toBe('META');
		});
	});
});

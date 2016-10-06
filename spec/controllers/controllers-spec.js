/* global describe, xdescribe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const MockExpressRequest = require('mock-express-request');
const MockExpressResponse = require('mock-express-response');

const Controller = require('../../lib/controllers/controller');

class CustomerController {
	get(req, res, next) {
		res.body = {message: 'Awesome'};
		next();
	}
}

describe('Controllers', function () {
	let req;
	let res;
	let customControllerMiddleware;

	beforeAll(() => {
		customControllerMiddleware = Controller.create(new CustomerController());
	});

	xdescribe('instance fetchChannel()', function () {});
	xdescribe('instance getFetchChannel()', function () {});
	xdescribe('instance patchFetchChannel()', function () {});
	xdescribe('instance patchIdentityFetchChannel()', function () {});
	xdescribe('instance postFetchChannel()', function () {});
	xdescribe('instance deleteFetchChannel()', function () {});

	describe('static create()', function () {
		it('proxies to a defined method', function (done) {
			req = new MockExpressRequest({method: 'GET'});
			res = new MockExpressResponse();

			customControllerMiddleware(req, res, function () {
				expect(res.body.message).toBe('Awesome');
				done();
			});
		});

		it('responds with an error with an undefined method', function (done) {
			req = new MockExpressRequest({method: 'POST'});
			res = new MockExpressResponse();

			customControllerMiddleware(req, res, function (err) {
				expect(err.output.payload.statusCode).toBe(405);
				expect(err.output.payload.error).toBe('Method Not Allowed');
				expect(res.body).toBeUndefined();
				done();
			});
		});
	});
});

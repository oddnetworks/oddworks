/* global describe, beforeEach, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const requestVerify = require('../../lib/middleware/request-verify');

describe('Middleware: Request Verify', () => {
	let bus;
	let req;
	let res;

	beforeEach(function () {
		bus = this.createBus();

		req = {
			identity: {
				channel: {id: 'channel-id', features: {authentication: {}}},
				viewer: {id: 'viewer-id', attributes: {entitlements: ['gold', 'monthly']}}
			}
		};
		res = {body: {data: null}};
	});

	it('bypasses verify when there is no viewer', done => {
		delete req.identity.viewer;

		res.body.data = {
			id: 'some-video',
			meta: {}
		};

		requestVerify({bus})(req, res, function (err) {
			expect(err).toBeUndefined();
			done();
		});
	});

	it('does not verify when evaluator fails', done => {
		req.identity.channel.features.authentication.evaluators = {
			verify: `function (bus, req, res) {
				return Promise.reject(Boom.unauthorized('Your account is no longer valid.'));
			}`
		};

		res.body.data = {
			id: 'some-video',
			meta: {}
		};

		requestVerify({bus})(req, res, function (err) {
			expect(err.isBoom).toBe(true);
			expect(err.output.statusCode).toBe(401);
			expect(err.output.payload.error).toBe('Unauthorized');
			expect(err.output.payload.message).toBe('Your account is no longer valid.');
			done();
		});
	});

	it('does not verify when evaluator is malformed', done => {
		req.identity.channel.features.authentication.evaluators = {
			verify: `dsadsadsassda`
		};

		res.body.data = {
			id: 'some-video',
			meta: {}
		};

		requestVerify({bus})(req, res, function (err) {
			expect(err.isBoom).toBe(true);
			expect(err.output.statusCode).toBe(401);
			expect(err.output.payload.error).toBe('Unauthorized');
			expect(err.output.payload.message).toBeDefined();
			done();
		});
	});

	it('does verify when evaluator passes', done => {
		req.identity.channel.features.authentication.evaluators = {
			verify: `function (bus, req, res) {
				return Promise.resolve(true);
			}`
		};

		res.body.data = {
			id: 'some-video',
			meta: {}
		};

		requestVerify({bus})(req, res, function (err) {
			expect(err).toBeUndefined();
			done();
		});
	});
});

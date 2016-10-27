/* global describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('node-uuid');
const IdentityChannelsListController = require('../../../../lib/services/identity/controllers/identity-channels-list-controller');

describe('Identity Channels List Controller', function () {
	const type = 'channel';
	let handler;
	let bus;

	function createRequest(spec) {
		const req = {
			method: 'GET',
			identity: {},
			params: {},
			query: {},
			body: null
		};

		return _.merge(req, spec);
	}

	function createResponse(spec) {
		const res = {
			status(code) {
				this.statusCode = code;
			}
		};

		return _.merge(res, spec);
	}

	beforeAll(function () {
		bus = this.createBus();
		handler = IdentityChannelsListController.create({bus, type});

		bus.queryHandler({role: 'store', cmd: 'get', type: 'channel'}, args => {
			if (args.id === 'non-existent-channel') {
				return Promise.resolve(null);
			}
			return Promise.resolve({type: 'channel', id: args.id});
		});

		bus.commandHandler({role: 'store', cmd: 'set', type: 'channel'}, args => {
			args = _.cloneDeep(args);
			args.id = args.id || uuid.v4();
			return Promise.resolve(_.merge({type: 'channel'}, args));
		});

		bus.queryHandler({role: 'store', cmd: 'scan', type: 'channel'}, () => {
			const results = _.range(11).map(() => {
				return {type: 'channel', id: uuid.v4()};
			});

			results.push({type: 'channel', id: 'jwt-channel-id'});
			return Promise.resolve(results);
		});
	});

	describe('GET', function () {
		const method = 'GET';

		// Performing a GET request with platform role.
		describe('as platform', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['platform'])
			});

			// Performing a GET request with platform role.
			describe('when channel not in the JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					req = createRequest({method, identity});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not query for the channel', function () {
					expect(bus.query).not.toHaveBeenCalled();
				});

				it('does not query for the resource', function () {
					expect(bus.query).not.toHaveBeenCalled();
				});

				it('returns a 403 error', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Non admin callers must have a channel embedded in the JSON Web Token');
				});
			});

			// Performing a GET request with platform role.
			describe('with valid request', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					req = createRequest({method, identity});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('calls store scan', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'scan', type});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type, limit: 10});
				});

				it('return 200 response', function () {
					expect(res.statusCode).toBe(200);
				});

				it('returns an array of channel objects', function () {
					expect(Array.isArray(res.body)).toBe(true);
					expect(res.body.length).toBe(1);
					expect(res.body[0].type).toBe('channel');
				});

				it('only returns the channel for which this JWT has access', function () {
					expect(res.body.length).toBe(1);
					expect(res.body[0].id).toBe('jwt-channel-id');
				});
			});
		});

		// Performing a GET request with admin role.
		describe('as admin', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a GET request with admin role.
			describe('when no channel is specified', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const query = {};
					req = createRequest({method, identity, query});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('calls store scan', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'scan', type});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type, limit: 10});
				});

				it('return 200 response', function () {
					expect(res.statusCode).toBe(200);
				});

				it('returns an array of channel objects', function () {
					expect(Array.isArray(res.body)).toBe(true);
					expect(res.body.length).toBe(10);
					res.body.forEach(item => {
						expect(item.type).toBe('channel');
					});
				});
			});
		});
	});

	describe('POST', function () {
		const method = 'POST';
		const BODY = Object.freeze({
			type,
			foo: 'bar'
		});

		// Performing a POST request with platform role.
		//
		// We don't test this case, because platform requests are not
		// authorized to POST a channel via the authorize middleware.
		// describe('as platform', function () {
		// });

		// Identity List Controller with type === "channel".
		// Performing a POST request with admin role.
		describe('as admin', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a POST request with platform role.
			describe('when no channel is specified', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const body = BODY;
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				// An admin caller can access a channel resource without specifying it
				// in the JWT or query parameters.

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('saves the resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'set', type});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({type, foo: 'bar'});
				});

				it('returns status code 201', function () {
					expect(res.statusCode).toBe(201);
				});

				it('assigns the resource to the response body', function () {
					expect(res.body.type).toBe(type);
					expect(res.body.id).toMatch(/^[0-9a-z\-]{36}$/);
					expect(res.body.foo).toBe('bar');
				});
			});

			// Performing a POST request with platform role.
			describe('when the resource already exists', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const body = _.merge({}, BODY, {id: 'some-existing-channel-id'});
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not set the existing resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('responds with 409', function () {
					expect(error.output.payload.statusCode).toBe(409);
					expect(error.output.payload.message).toBe('The channel "some-existing-channel-id" already exists');
				});
			});
		});
	});
});

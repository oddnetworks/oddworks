/* global describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const CatalogListController = require('../../../../lib/services/catalog/controllers/catalog-list-controller');

describe('Catalog List Controller', function () {
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

	describe('LIST', function () {
	});

	describe('POST', function () {
		const TYPE = 'video';

		const bus = {
			query() {
				return Promise.resolve(null);
			},
			sendCommand() {
				return Promise.resolve(null);
			}
		};

		const handler = CatalogListController.create({bus, type: TYPE});

		describe('platform request', function () {
			const req = createRequest({
				method: 'POST',
				params: {
					id: 'VIDEO_ID'
				},
				identity: {
					platform: {id: 'PLATFORM'},
					channel: {id: 'CHANNEL'}
				}
			});

			const res = createResponse();

			let execError = null;

			beforeAll(function (done) {
				handler(req, res, err => {
					execError = err || null;
					return done();
				});
			});

			it('rejects with a forbidden error', function () {
				expect(execError instanceof Error).toBe(true);
				expect(execError.message).toBe(`Non admins may not create resources`);
				const payload = _.get(execError, 'output.payload', {});
				expect(payload.statusCode).toBe(403);
			});
		});

		describe('admin request', function () {
			const payload = {
				channel: 'channel-id',
				type: TYPE,
				id: 'VIDEO_ID',
				title: 'A Title'
			};

			const request = createRequest({
				method: 'POST',
				params: {
					id: payload.id
				},
				identity: {
					audience: ['admin']
				},
				body: payload
			});

			describe('when channel attribute missing', function () {
				const req = _.merge({}, request, {
					body: {
						channel: null
					}
				});

				const res = createResponse();

				let execError = null;

				beforeAll(function (done) {
					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('rejects with a bad request error', function () {
					expect(execError instanceof Error).toBe(true);
					expect(execError.message).toBe(`The "channel" attribute is required when none included in the JSON Web Token`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(422);
				});
			});

			describe('when channel not found', function () {
				const req = request;
				const res = createResponse();

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValue(Promise.resolve(null));

					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('rejects with a forbidden error', function () {
					expect(execError instanceof Error).toBe(true);
					expect(execError.message).toBe(`Channel "channel-id" does not exist`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(403);
				});
			});

			describe('with an ID conflict', function () {
				const req = request;
				const res = createResponse();

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValues(
						Promise.resolve({type: 'channel', id: req.body.channel}),
						Promise.resolve({type: req.body.type, id: req.body.id})
					);

					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('rejects with a conflict error', function () {
					expect(execError instanceof Error).toBe(true);
					expect(execError.message).toBe(`The video "VIDEO_ID" already exists`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(409);
				});
			});

			describe('with no conflict', function () {
				const req = request;
				const res = createResponse();

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValues(
						Promise.resolve({type: 'channel', id: req.body.channel}),
						Promise.resolve(null)
					);

					spyOn(bus, 'sendCommand').and.callFake(function (pattern, record) {
						return record;
					});

					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('does not have an error', function () {
					expect(execError).toBe(null);
				});

				it('calls store get() for channel', function () {
					expect(bus.query).toHaveBeenCalledTimes(2);

					let args = bus.query.calls.argsFor(0);
					const pattern = args[0];
					args = args[1];

					expect(pattern).toEqual({role: 'store', cmd: 'get', type: 'channel'});
					expect(args.type).toBe('channel');
					expect(args.id).toEqual('channel-id');
				});

				it('calls store get() for resource', function () {
					expect(bus.query).toHaveBeenCalledTimes(2);

					let args = bus.query.calls.argsFor(1);
					const pattern = args[0];
					args = args[1];

					expect(pattern).toEqual({role: 'store', cmd: 'get', type: 'video'});
					expect(args.type).toBe(TYPE);
					expect(args.id).toBe(req.params.id);
					expect(args.channel).toEqual('channel-id');
				});

				it('calls catalog setItem to update the resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);

					const args = bus.sendCommand.calls.argsFor(0);
					const pattern = args[0];
					const resource = args[1];

					expect(pattern).toEqual({role: 'catalog', cmd: 'setItem'});
					expect(resource).toEqual({channel: 'channel-id', type: 'video', id: 'VIDEO_ID', title: 'A Title'});
				});

				it('sets status code 201', function () {
					expect(res.statusCode).toBe(201);
				});

				it('assigns the resource to the body', function () {
					expect(res.body.type).toBe(payload.type);
					expect(res.body.id).toBe(payload.id);
				});
			});
		});
	});
});

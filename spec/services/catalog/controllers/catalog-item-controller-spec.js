/* global describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const CatalogItemController = require('../../../../lib/services/catalog/controllers/catalog-item-controller');

describe('Catalog Item Controller', function () {
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

	describe('GET video', function () {
		const TYPE = 'video';

		const bus = {
			query() {
				return Promise.resolve(null);
			}
		};

		const handler = CatalogItemController.create({bus, type: TYPE});

		describe('platform request', function () {
			const request = createRequest({
				method: 'GET',
				params: {
					id: 'VIDEO_ID'
				},
				identity: {
					platform: {id: 'PLATFORM'},
					channel: {id: 'CHANNEL'}
				}
			});

			describe('when platform not present', function () {
				const req = _.merge({}, request, {
					identity: {
						platform: null
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
					expect(execError.message).toBe(`A JSON Web Token with a platform is required in a platform request`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(400);
				});
			});

			describe('when channel not present', function () {
				const req = _.merge({}, request, {
					identity: {
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

				it('rejects with a forbidden error', function () {
					expect(execError instanceof Error).toBe(true);
					expect(execError.message).toBe(`Non admin callers must have a channel embedded in the JSON Web Token`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(403);
				});
			});

			describe('when not found', function () {
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

				it('rejects with a not found error', function () {
					expect(execError instanceof Error).toBe(true);
					expect(execError.message).toBe(`video "VIDEO_ID" not found`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(404);
				});
			});

			describe('when found', function () {
				const req = _.merge({}, request, {
					query: {
						include: 'related,trailers'
					}
				});

				const res = createResponse();

				const resource = {
					type: TYPE,
					id: req.params.id,
					included: [1, 2, 3]
				};

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValue(Promise.resolve(resource));

					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('does not have an error', function () {
					expect(execError).toBe(null);
				});

				it('calls catalog fetchItem()', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);

					let args = bus.query.calls.argsFor(0);
					const pattern = args[0];
					args = args[1];

					expect(pattern).toEqual({role: 'catalog', cmd: 'fetchItem'});
					expect(args.type).toBe(TYPE);
					expect(args.id).toBe(req.params.id);
					expect(args.channel).toEqual(req.identity.channel);
					expect(args.platform).toEqual(req.identity.platform);
					expect(args.include).toEqual(['related', 'trailers']);
				});

				it('sets status code 200', function () {
					expect(res.statusCode).toBe(200);
				});

				it('assigns the resource to the body', function () {
					expect(res.body.type).toBe(resource.type);
					expect(res.body.id).toBe(resource.id);
				});

				it('assigns included items to the body', function () {
					expect(res.body.included).toEqual([1, 2, 3]);
				});
			});

			describe('with viewer progress', function () {
				const req = _.merge({}, request, {
					query: {
						include: 'related'
					},
					identity: {
						viewer: {
							id: 'VIEWER_ID'
						}
					}
				});

				const res = createResponse();

				const resource = {
					type: TYPE,
					id: req.params.id,
					included: [{id: 'RELATED_VIDEO', type: 'video'}]
				};

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValues(
						Promise.resolve(resource),
						Promise.resolve({position: 1, complete: 50}),
						Promise.resolve(null)
					);

					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('does not have an error', function () {
					expect(execError).toBe(null);
				});

				it('queries for viewer progress', function () {
					expect(bus.query).toHaveBeenCalledTimes(3);

					let args = bus.query.calls.argsFor(1);
					const pattern = args[0];
					args = args[1];

					expect(pattern).toEqual({role: 'store', cmd: 'get', type: 'progress'});
					expect(args).toEqual({id: `VIDEO_ID:VIEWER_ID`, type: 'progress', channel: 'CHANNEL'});
				});

				it('assigns viewer progress to the body', function () {
					expect(res.body.type).toBe(resource.type);
					expect(res.body.id).toBe(resource.id);
					expect(res.body.position).toBe(1);
					expect(res.body.complete).toBe(50);
				});

				it('assigns viewer progress to included videos', function () {
					const video = res.body.included[0];

					expect(video.type).toBe('video');
					expect(video.id).toBe('RELATED_VIDEO');
					expect(video.position).toBe(0);
					expect(video.complete).toBe(false);
				});
			});
		});

		describe('admin request', function () {
			const request = createRequest({
				method: 'GET',
				params: {
					id: 'VIDEO_ID'
				},
				identity: {
					audience: ['admin']
				},
				query: {
					channel: 'channel-id'
				}
			});

			describe('when channel query param missing', function () {
				const req = _.merge({}, request, {
					query: {
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
					expect(execError.message).toBe(`The "channel" query parameter is required when none included in the JSON Web Token`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(400);
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

			describe('when channel present', function () {
				const req = request;
				const res = createResponse();

				const resource = {
					type: TYPE,
					id: req.params.id
				};

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValues(
						Promise.resolve({type: 'channel', id: req.query.channel}),
						Promise.resolve(resource)
					);

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

				it('sets status code 200', function () {
					expect(res.statusCode).toBe(200);
				});

				it('assigns the resource to the body', function () {
					expect(res.body.type).toBe(resource.type);
					expect(res.body.id).toBe(resource.id);
				});
			});
		});
	});

	describe('PATCH', function () {
		describe('platform request', function () {
			describe('not found', function () {
			});
		});

		describe('admin request', function () {
			describe('not found', function () {
			});
		});
	});

	describe('DELETE', function () {
		const TYPE = 'video';

		const bus = {
			query() {
				return Promise.resolve(null);
			},
			sendCommand() {
				return Promise.resolve(null);
			}
		};

		const handler = CatalogItemController.create({bus, type: TYPE});

		describe('platform request', function () {
			const req = createRequest({
				method: 'DELETE',
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
				expect(execError.message).toBe(`Platforms may not delete resources`);
				const payload = _.get(execError, 'output.payload', {});
				expect(payload.statusCode).toBe(403);
			});
		});

		describe('admin request', function () {
			const request = createRequest({
				method: 'DELETE',
				params: {
					id: 'VIDEO_ID'
				},
				identity: {
					audience: ['admin']
				},
				query: {
					channel: 'channel-id'
				}
			});

			describe('when channel query param missing', function () {
				const req = _.merge({}, request, {
					query: {
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
					expect(execError.message).toBe(`The "channel" query parameter is required when none included in the JSON Web Token`);
					const payload = _.get(execError, 'output.payload', {});
					expect(payload.statusCode).toBe(400);
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

			describe('when channel present', function () {
				const req = request;
				const res = createResponse();

				let execError = null;

				beforeAll(function (done) {
					spyOn(bus, 'query').and.returnValue(
						Promise.resolve({type: 'channel', id: req.query.channel})
					);

					spyOn(bus, 'sendCommand').and.returnValue(
						Promise.resolve(true)
					);

					handler(req, res, err => {
						execError = err || null;
						return done();
					});
				});

				it('does not have an error', function () {
					expect(execError).toBe(null);
				});

				it('calls store get() for channel', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);

					let args = bus.query.calls.argsFor(0);
					const pattern = args[0];
					args = args[1];

					expect(pattern).toEqual({role: 'store', cmd: 'get', type: 'channel'});
					expect(args.type).toBe('channel');
					expect(args.id).toEqual('channel-id');
				});

				it('calls catalog removeItem() for resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);

					let args = bus.sendCommand.calls.argsFor(0);
					const pattern = args[0];
					args = args[1];

					expect(pattern).toEqual({role: 'catalog', cmd: 'removeItem'});
					expect(args.type).toBe(TYPE);
					expect(args.id).toBe(req.params.id);
					expect(args.channel).toEqual('channel-id');
				});

				it('sets status code 200', function () {
					expect(res.statusCode).toBe(200);
				});

				it('assigns an empty body', function () {
					expect(res.body).toEqual({});
				});
			});
		});
	});
});

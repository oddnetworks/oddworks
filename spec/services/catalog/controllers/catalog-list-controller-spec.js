/* global describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const uuid = require('uuid/v4');
const CatalogListController = require('../../../../lib/services/catalog/controllers/catalog-list-controller');

describe('Catalog List Controller', function () {
	const TYPES = Object.freeze(['video', 'view', 'collection', 'trumpet']);
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

	const type = _.sample(TYPES);
	let handler;

	beforeAll(function () {
		bus = this.createBus();

		bus.queryHandler({role: 'store', cmd: 'get', type: 'channel'}, args => {
			if (args.id === 'non-existent-channel') {
				return Promise.resolve(null);
			}
			return Promise.resolve({type: 'channel', id: args.id});
		});

		bus.queryHandler({role: 'store', cmd: 'get', type}, args => {
			if (args.id === 'non-existent-record') {
				return Promise.resolve(null);
			}
			return Promise.resolve({type, id: args.id});
		});

		bus.queryHandler({role: 'catalog', cmd: 'fetchItemList'}, args => {
			const channel = args.channel;
			const results = _.range(11).map(() => {
				return {channel, type, id: uuid()};
			});

			return Promise.resolve(results);
		});

		bus.queryHandler({role: 'store', cmd: 'scan', type}, args => {
			const channel = args.channel;
			return Promise.resolve(_.range(11).map(() => {
				return {channel, type, id: uuid()};
			}));
		});

		bus.commandHandler({role: 'catalog', cmd: 'setItem'}, payload => {
			return Promise.resolve(payload);
		});

		handler = CatalogListController.create({bus, type});
	});

	describe('GET', function () {
		const method = 'GET';

		describe('as platform role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['platform'])
			});

			// Performing a GET request with platform role.
			describe('when channel not in the JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {
						platform: {type: 'platform', id: 'a-platform-id'}
					}, IDENTITY);
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
			describe('without platform', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {
						channel: {type: 'channel', id: 'jwt-channel-id'}
					}, IDENTITY);
					const query = {};
					req = createRequest({method, identity, query});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not query for the resource', function () {
					expect(bus.query).not.toHaveBeenCalled();
				});

				it('returns a 400 error', function () {
					expect(error.output.payload.statusCode).toBe(400);
					expect(error.output.payload.message).toBe(
						'A JSON Web Token with a platform is required in a platform request'
					);
				});
			});

			// Performing a GET request with platform role.
			describe('with valid request', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {
						channel: {type: 'channel', id: 'jwt-channel-id'},
						platform: {type: 'platform', id: 'a-platform-id'}
					}, IDENTITY);
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

				it('calls catalog fetchItemList', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'fetchItemList'});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({
						channel: {type: 'channel', id: 'jwt-channel-id'},
						platform: {type: 'platform', id: 'a-platform-id'},
						viewer: undefined,
						type,
						limit: 10
					});
				});

				it('return 200 response', function () {
					expect(res.statusCode).toBe(200);
				});

				it('returns an array of resource objects', function () {
					expect(Array.isArray(res.body)).toBe(true);
					expect(res.body.length).toBe(10);
					res.body.forEach(item => {
						expect(item.type).toBe(type);
						expect(item.channel).toEqual({type: 'channel', id: 'jwt-channel-id'});
					});
				});
			});
		});

		describe('as admin role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a GET request with admin role.
			describe('with channel in query parameter and JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);
					const query = {channel: 'query-channel-id'};
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

				it('queries for the resource using the channel in the query parameter', function () {
					expect(bus.query).toHaveBeenCalledTimes(2);
					expect(bus.query.calls.argsFor(1)[0]).toEqual({role: 'store', cmd: 'scan', type});
					expect(bus.query.calls.argsFor(1)[1]).toEqual({type, limit: 10, channel: 'query-channel-id'});
				});
			});

			// Performing a GET request with admin role.
			describe('with channel in JWT only (not query parameter)', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);
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

				it('queries for the resources using the channel in the JWT', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'scan', type});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type, limit: 10, channel: 'jwt-channel-id'});
				});
			});

			// Performing a GET request with admin role.
			describe('no channel is specified', function () {
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

				it('does not query for the resource', function () {
					expect(bus.query).not.toHaveBeenCalled();
				});

				it('return a 400 error', function () {
					expect(error.output.payload.statusCode).toBe(400);
					expect(error.output.payload.message).toBe('The "channel" query parameter is required');
				});
			});

			// Performing a GET request with admin role.
			describe('when the specified channel does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const query = {channel: 'query-channel-id'};
					req = createRequest({method, identity, query});
					res = createResponse();

					spyOn(bus, 'query').and.returnValue(Promise.resolve(null));

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not qeury for the resource', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
				});

				it('returns an error', function () {
					expect(error).toBeDefined();
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Channel "query-channel-id" does not exist');
				});

				it('does not attach the resource to the response body', function () {
					expect(res.body).not.toBeDefined();
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

		describe('as platform role', function () {
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

			// Performing a POST request with platform role.
			describe('with valid request', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = BODY;
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();
					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('saves the resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'setItem'});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({
						channel: 'jwt-channel-id',
						type,
						foo: 'bar'
					});
				});

				it('returns a 201', function () {
					expect(res.statusCode).toBe(201);
				});

				it('attaches the new resource as the response body', function () {
					expect(res.body).toEqual({
						type,
						channel: 'jwt-channel-id',
						foo: 'bar'
					});
				});
			});

			// Performing a POST request with platform role.
			describe('with client defined uid', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = _.merge({}, BODY, {
						id: 'non-existent-record'
					});
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();
					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('uses the client defined id', function () {
					const resource = bus.sendCommand.calls.argsFor(0)[1];
					expect(resource.id).toBe('non-existent-record');
				});
			});

			// Performing a POST request with platform role.
			describe('when channel is not included in the payload', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = BODY;
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('saves the resource with the channel ID', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({
						type,
						channel: 'jwt-channel-id',
						foo: 'bar'
					});
				});
			});

			// Performing a POST request with platform role.
			describe('when attempting to override channel or type', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = _.merge({}, BODY, {
						type: 'pluto',
						channel: 'some-other-channel'
					});
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('uses pre-determined channel and type', function () {
					const resource = bus.sendCommand.calls.argsFor(0)[1];
					expect(resource.type).toBe(type);
					expect(resource.channel).toBe('jwt-channel-id');
				});
			});

			// Performing a POST request with platform role.
			describe('when the resource already exists', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = _.merge({id: 'some-resource-id'}, BODY);
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
					expect(error.output.payload.message).toBe(`The ${type} "some-resource-id" already exists`);
				});
			});
		});

		describe('as admin role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a POST request with admin role.
			describe('with channel in the body and JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = _.merge({channel: 'attribute-channel-id'}, BODY);
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('saves the resource with the channel in the query parameter', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'setItem'});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({channel: 'attribute-channel-id', type, foo: 'bar'});
				});
			});

			// Performing a POST request with admin role.
			describe('with channel in the JWT only (not body)', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {id: 'jwt-channel-id'}}, IDENTITY);
					const body = BODY;
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('saves the resource with the channel in the JWT', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'setItem'});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({type, foo: 'bar', channel: 'jwt-channel-id'});
				});
			});

			// Performing a POST request with admin role.
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

				it('does not save the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('return a 422 error', function () {
					expect(error.output.payload.statusCode).toBe(422);
					expect(error.output.payload.message).toBe('The "channel" attribute is required');
				});
			});

			// Performing a POST request with admin role.
			describe('when the channel does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const body = _.merge({channel: 'non-existent-channel'}, BODY);
					req = createRequest({method, identity, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not save the the source', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('returns a 403 error', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Channel "non-existent-channel" does not exist');
				});
			});
		});
	});
});

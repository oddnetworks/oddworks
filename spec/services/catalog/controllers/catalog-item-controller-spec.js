/* global describe, beforeAll, it, expect, spyOn */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const CatalogItemController = require('../../../../lib/services/catalog/controllers/catalog-item-controller');

describe('Catalog Item Controller', function () {
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

		bus.queryHandler({role: 'catalog', cmd: 'fetchItem'}, args => {
			if (args.id === 'non-existent-resource') {
				return Promise.resolve(null);
			}
			return Promise.resolve({type, id: args.id, channel: args.channel});
		});

		bus.queryHandler({role: 'store', cmd: 'get', type}, args => {
			if (args.id === 'non-existent-record') {
				return Promise.resolve(null);
			}
			return Promise.resolve({type, id: args.id, channel: args.channel});
		});

		bus.commandHandler({role: 'catalog', cmd: 'setItem'}, payload => {
			return Promise.resolve(payload);
		});

		bus.commandHandler({role: 'catalog', cmd: 'removeItem'}, () => {
			return Promise.resolve(true);
		});

		handler = CatalogItemController.create({bus, type});
	});

	describe('GET', function () {
		const method = 'GET';
		const params = Object.freeze({id: 'record-id'});

		describe('as platform role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['platform'])
			});

			// Performing a GET request with "platform" role.
			describe('when channel not in the JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({
						platform: {type: 'platform', id: 'a-platform-id'}
					}, IDENTITY);

					req = createRequest({method, identity, params});
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

			describe('without platform', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {type: 'channel', id: 'a-channel-id'}}, IDENTITY);

					req = createRequest({method, identity, params});
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

			// Performing a GET request with "platform" role.
			describe('when resource exists', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({
						channel: {type: 'channel', id: 'a-channel-id'},
						platform: {type: 'platform', id: 'a-platform-id'}
					}, IDENTITY);

					req = createRequest({method, identity, params});
					res = createResponse();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('returns status code 200', function () {
					expect(res.statusCode).toBe(200);
				});

				it('assigns the resource to the response body', function () {
					expect(res.body).toEqual({
						type,
						id: params.id,
						channel: {type: 'channel', id: 'a-channel-id'}
					});
				});
			});

			// Performing a GET request with "platform" role.
			describe('when resource does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({
						channel: {type: 'channel', id: 'a-channel-id'},
						platform: {type: 'platform', id: 'a-platform-id'}
					}, IDENTITY);
					const params = {id: 'non-existent-resource'};
					req = createRequest({method, identity, params});
					res = createResponse();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('returns a 404 status code', function () {
					expect(error.output.payload.statusCode).toBe(404);
				});

				it('does not assign a resource to the response', function () {
					expect(res.body).not.toBeDefined();
				});
			});
		});

		describe('as admin role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a GET request with "admin" role.
			describe('with channel in query parameter and JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const query = {channel: 'query-channel-id'};
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);

					req = createRequest({method, identity, params, query});
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

				it('queries for the channel in the query parameter', function () {
					expect(bus.query).toHaveBeenCalledTimes(2);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type: 'channel'});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type: 'channel', id: 'query-channel-id'});
				});

				// When no platform ID is present in the JWT during an admin role request,
				// the query for the resource is made directly to the store instead of through
				// the catalog service.
				it('queries the resource through the store insetad of the catalog', function () {
					expect(bus.query).toHaveBeenCalledTimes(2);
					expect(bus.query.calls.argsFor(1)[0]).toEqual({role: 'store', cmd: 'get', type});
				});
			});

			// Performing a GET request with "admin" role.
			describe('with channel in JWT only (not query parameter)', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);

					req = createRequest({method, identity, params});
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

				it('queries the resource using the channel in the JWT', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					const args = bus.query.calls.argsFor(0)[1];
					expect(args.channel).toEqual({type: 'channel', id: 'jwt-channel-id'});
				});

				// When no platform ID is present in the JWT during an admin role request,
				// the query for the resource is made directly to the store instead of through
				// the catalog service.
				it('queries the resource through the store insetad of the catalog', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type});
				});
			});

			// Performing a GET request with "admin" role.
			describe('when no channel is specified', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					req = createRequest({method, identity, params});
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

			// Performing a GET request with "admin" role.
			describe('when the specified channel does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const query = {channel: 'query-channel-id'};
					const identity = IDENTITY;

					req = createRequest({method, identity, params, query});
					res = createResponse();

					spyOn(bus, 'query').and.returnValue(Promise.resolve(null));

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('returns a 403 error', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Channel "query-channel-id" does not exist');
				});

				it('does not qeury for the resource', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
				});

				it('does not attach the resource to the response body', function () {
					expect(res.body).not.toBeDefined();
				});
			});
		});
	});

	describe('PATCH', function () {
		const method = 'PATCH';
		const params = Object.freeze({id: 'record-id'});
		const BODY = Object.freeze({
			type,
			id: params.id,
			foo: 'bar'
		});

		describe('as platform role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['platform'])
			});

			// Performing a PATCH request with "platform" role.
			describe('when the channel is not in the JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const body = _.merge({channel: 'a-channel-id'}, BODY);
					req = createRequest({method, identity, params, body});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();
					spyOn(bus, 'sendCommand').and.callThrough();

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

				it('does not attempt to save the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('returns a 403', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Non admin callers must have a channel embedded in the JSON Web Token');
				});
			});

			// Performing a PATCH request with "platform" role.
			describe('when the resource does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {type: 'channel', id: 'a-channel-id'}}, IDENTITY);
					const params = {id: 'non-existent-record'};
					const body = _.merge({channel: identity.channel.id}, BODY);
					req = createRequest({method, identity, params, body});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not attempt to save the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('returns a 404 status code', function () {
					expect(error.output.payload.statusCode).toBe(404);
				});

				it('does not assign a resource to the response', function () {
					expect(res.body).not.toBeDefined();
				});
			});

			// Performing a PATCH request with "platform" role.
			describe('with valid request', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {type: 'channel', id: 'a-channel-id'}}, IDENTITY);
					const body = _.merge({channel: identity.channel.id}, BODY);
					req = createRequest({method, identity, params, body});
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

				it('queries for the resource', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type});

					const args = bus.query.calls.argsFor(0)[1];
					expect(args.channel).toEqual('a-channel-id');
					expect(args.type).toEqual(type);
					expect(args.id).toEqual('record-id');
				});

				it('saves the resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'setItem'});
				});

				it('updates the resource', function () {
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({
						type,
						id: params.id,
						channel: 'a-channel-id',
						foo: 'bar'
					});
				});

				it('returns a 200', function () {
					expect(res.statusCode).toBe(200);
				});

				it('attaches the updated resource as response body', function () {
					expect(res.body).toEqual({
						type,
						id: params.id,
						channel: 'a-channel-id',
						foo: 'bar'
					});
				});
			});

			// Performing a PATCH request with "platform" role.
			describe('when channel is not included in the payload', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {type: 'channel', id: 'a-channel-id'}}, IDENTITY);
					const body = BODY;
					req = createRequest({method, identity, params, body});
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

				it('updates the resource with the channel ID', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({
						type,
						id: params.id,
						channel: 'a-channel-id',
						foo: 'bar'
					});
				});
			});

			// Performing a PATCH request with "platform" role.
			describe('when attempting to update channel, type, or id attributes', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {type: 'channel', id: 'a-channel-id'}}, IDENTITY);
					const body = _.merge({}, BODY, {
						type: 'pluto',
						id: 'some-other-id',
						channel: 'another-channel-id'
					});
					req = createRequest({method, identity, params, body});
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

				it('does not update channel, type, or id', function () {
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({
						type,
						id: params.id,
						channel: 'a-channel-id',
						foo: 'bar'
					});
				});
			});
		});

		describe('as admin role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a PATCH request with "admin" role.
			describe('with channel in body and JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const channelId = 'attribute-channel-id';
					const body = _.merge({channel: channelId}, BODY);
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);

					req = createRequest({method, identity, params, body});
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

				it('queries for the channel in the body', function () {
					expect(bus.query).toHaveBeenCalledTimes(2);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type: 'channel'});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type: 'channel', id: 'attribute-channel-id'});
				});
			});

			// Performing a PATCH request with "admin" role.
			describe('with channel in JWT only (not body)', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);
					const body = BODY;

					req = createRequest({method, identity, params, body});
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

				it('queries for the channel in the JWT', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type, id: params.id, channel: 'jwt-channel-id'});
				});
			});

			// Performing a PATCH request with "admin" role.
			describe('when no channel is specified', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const body = BODY;

					req = createRequest({method, identity, params, body});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();
					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not query for the resource', function () {
					expect(bus.query).not.toHaveBeenCalled();
				});

				it('does not save the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('return a 422 error', function () {
					expect(error.output.payload.statusCode).toBe(422);
					expect(error.output.payload.message).toBe('The "channel" attribute is required');
				});
			});

			// Performing a PATCH request with "admin" role.
			describe('when the channel does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const channelId = 'attribute-channel-id';
					const body = _.merge({channel: channelId}, BODY);
					const identity = IDENTITY;

					req = createRequest({method, identity, params, body});
					res = createResponse();

					spyOn(bus, 'query').and.returnValue(Promise.resolve(null));
					spyOn(bus, 'sendCommand').and.returnValue(Promise.resolve(null));

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not query for the resource', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type: 'channel'});
				});

				it('does not save the the source', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('returns a 403 error', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Channel "attribute-channel-id" does not exist');
				});
			});

			// Performing a PATCH request with "admin" role.
			describe('with a valid request', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const body = _.merge({channel: 'attribute-channel-id'}, BODY);
					const identity = IDENTITY;

					req = createRequest({method, identity, params, body});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();
					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('queries for the resource', function () {
					const args = bus.query.calls.argsFor(1);
					expect(args[0]).toEqual({role: 'store', cmd: 'get', type});
					expect(args[1]).toEqual({channel: 'attribute-channel-id', type, id: BODY.id});
				});

				it('updates the resource', function () {
					const args = bus.sendCommand.calls.argsFor(0);
					expect(args[0]).toEqual({role: 'catalog', cmd: 'setItem'});
					expect(args[1]).toEqual({type, id: BODY.id, channel: 'attribute-channel-id', foo: 'bar'});
				});

				it('does not return an error', function () {
					expect(error).not.toBeDefined();
				});

				it('returns a 200', function () {
					expect(res.statusCode).toBe(200);
				});

				it('returns the updated resource', function () {
					expect(res.body).toEqual({type, id: BODY.id, channel: 'attribute-channel-id', foo: 'bar'});
				});
			});
		});
	});

	describe('DELETE', function () {
		const method = 'DELETE';
		const params = Object.freeze({id: 'record-id'});

		describe('as platform role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['platform'])
			});

			// Performing a DELETE request with "platform" role.
			describe('when channel not in the JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;

					req = createRequest({method, identity, params});
					res = createResponse();

					spyOn(bus, 'query').and.callThrough();
					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not query for the channel', function () {
					expect(bus.query).not.toHaveBeenCalled();
				});

				it('does not remove the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('returns a 403 error', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Non admin callers must have a channel embedded in the JSON Web Token');
				});
			});

			// Performing a DELETE request with "platform" role.
			describe('when resource exists', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({channel: {type: 'channel', id: 'a-channel-id'}}, IDENTITY);
					req = createRequest({method, identity, params});
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

				it('removes the resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'removeItem'});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({type, id: params.id, channel: 'a-channel-id'});
				});

				it('returns status code 200', function () {
					expect(res.statusCode).toBe(200);
				});
			});
		});

		describe('as admin role', function () {
			const IDENTITY = Object.freeze({
				audience: Object.freeze(['admin'])
			});

			// Performing a DELETE request with "admin" role.
			describe('with channel in query parameter and JWT', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const query = {channel: 'query-channel-id'};
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);

					req = createRequest({method, identity, params, query});
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

				it('queries for the channel in the query parameter', function () {
					expect(bus.query).toHaveBeenCalledTimes(1);
					expect(bus.query.calls.argsFor(0)[0]).toEqual({role: 'store', cmd: 'get', type: 'channel'});
					expect(bus.query.calls.argsFor(0)[1]).toEqual({type: 'channel', id: 'query-channel-id'});
				});
			});

			// Performing a DELETE request with "admin" role.
			describe('with channel in JWT only (not query parameter)', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = _.merge({}, {channel: {type: 'channel', id: 'jwt-channel-id'}}, IDENTITY);

					req = createRequest({method, identity, params});
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

				it('removes the resource using channel in JWT', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'removeItem'});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({type, id: params.id, channel: 'jwt-channel-id'});
				});
			});

			// Performing a DELETE request with "admin" role.
			describe('when no channel is specified', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					req = createRequest({method, identity, params});
					res = createResponse();

					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('does not remove the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('return a 400 error', function () {
					expect(error.output.payload.statusCode).toBe(400);
					expect(error.output.payload.message).toBe('The "channel" query parameter is required');
				});
			});

			// Performing a DELETE request with "admin" role.
			describe('when the specified channel does not exist', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const query = {channel: 'query-channel-id'};
					const identity = IDENTITY;

					req = createRequest({method, identity, params, query});
					res = createResponse();

					spyOn(bus, 'query').and.returnValue(Promise.resolve(null));
					spyOn(bus, 'sendCommand').and.callThrough();

					handler(req, res, err => {
						error = err;
						done();
					});
				});

				it('returns a 403 error', function () {
					expect(error.output.payload.statusCode).toBe(403);
					expect(error.output.payload.message).toBe('Channel "query-channel-id" does not exist');
				});

				it('does not remove the resource', function () {
					expect(bus.sendCommand).not.toHaveBeenCalled();
				});

				it('does not attach the resource to the response body', function () {
					expect(res.body).not.toBeDefined();
				});
			});

			// Performing a DELETE request with "platform" role.
			describe('with valid request', function () {
				let req;
				let res;
				let error;

				beforeAll(function (done) {
					const identity = IDENTITY;
					const query = {channel: 'query-channel-id'};
					req = createRequest({method, identity, params, query});
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

				it('removes the resource', function () {
					expect(bus.sendCommand).toHaveBeenCalledTimes(1);
					expect(bus.sendCommand.calls.argsFor(0)[0]).toEqual({role: 'catalog', cmd: 'removeItem'});
					expect(bus.sendCommand.calls.argsFor(0)[1]).toEqual({channel: 'query-channel-id', type, id: params.id});
				});

				it('returns status code 200', function () {
					expect(res.statusCode).toBe(200);
				});
			});
		});
	});
});

/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const responseEntitlements = require('../../lib/middleware/response-entitlements');

describe('Middleware: Response Entitlements', () => {
	let bus;
	let req;
	let res;

	beforeAll(function () {
		bus = this.createBus();

		req = {
			identity: {
				channel: {id: 'channel-id', features: {authentication: {}}},
				viewer: {id: 'viewer-id', attributes: {entitlements: null}}
			}
		};
		res = {body: {data: null}};
	});

	describe('entitles true when auth is disabled', () => {
		beforeAll(() => {
			req.identity.channel.features.authentication = {
				enabled: false
			};
			req.identity.viewer.attributes.entitlements = ['gold', 'monthly'];
		});

		it('single entity', done => {
			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(true);
				done();
			});
		});

		it('single entity with included', done => {
			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};
			res.body.included = [{
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}];

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(true);
				expect(res.body.included[0].meta.entitled).toBe(true);
				expect(res.body.included[1].meta.entitled).toBe(true);
				expect(res.body.included[2].meta.entitled).toBe(true);
				done();
			});
		});

		it('multiple entities', done => {
			res.body.data = [{
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}];

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data[0].meta.entitled).toBe(true);
				expect(res.body.data[1].meta.entitled).toBe(true);
				expect(res.body.data[2].meta.entitled).toBe(true);
				done();
			});
		});
	});

	describe('entitles true when auth is enabled with evaluator', () => {
		beforeAll(() => {
			req.identity.channel.features.authentication = {
				enabled: true,
				evaluators: {
					entitlements: `function (viewer, resource) {
						if (viewer.attributes.entitlements.indexOf('gold') >= 0) {
							return true;
						}
						return false;
					}`
				}
			};
			req.identity.viewer.attributes.entitlements = ['gold', 'monthly'];
		});

		it('single entity', done => {
			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(true);
				done();
			});
		});

		it('single entity with included', done => {
			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};
			res.body.included = [{
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}];

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(true);
				expect(res.body.included[0].meta.entitled).toBe(true);
				expect(res.body.included[1].meta.entitled).toBe(true);
				expect(res.body.included[2].meta.entitled).toBe(true);
				done();
			});
		});

		it('multiple entities', done => {
			res.body.data = [{
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}];

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data[0].meta.entitled).toBe(true);
				expect(res.body.data[1].meta.entitled).toBe(true);
				expect(res.body.data[2].meta.entitled).toBe(true);
				done();
			});
		});
	});

	describe('entitles false when auth is enabled with evaluator', () => {
		beforeAll(() => {
			req.identity.channel.features.authentication = {
				enabled: true,
				evaluators: {
					entitlements: `function (viewer, resource) {
						if (viewer.attributes.entitlements.indexOf('gold') >= 0) {
							return true;
						}
						return false;
					}`
				}
			};
			req.identity.viewer.attributes.entitlements = ['silver'];
		});

		it('single entity', done => {
			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(false);
				done();
			});
		});

		it('single entity with included', done => {
			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};
			res.body.included = [{
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}];

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(false);
				expect(res.body.included[0].meta.entitled).toBe(false);
				expect(res.body.included[1].meta.entitled).toBe(false);
				expect(res.body.included[2].meta.entitled).toBe(false);
				done();
			});
		});

		it('multiple entities', done => {
			res.body.data = [{
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}, {
				id: 'some-video',
				type: 'video',
				meta: {}
			}];

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data[0].meta.entitled).toBe(false);
				expect(res.body.data[1].meta.entitled).toBe(false);
				expect(res.body.data[2].meta.entitled).toBe(false);
				done();
			});
		});
	});

	describe('entitles false when auth is enabled with bad evaluator', () => {
		beforeAll(() => {
			req.identity.viewer.attributes.entitlements = ['silver'];
		});

		it('that cannot be parsed', done => {
			req.identity.channel.features.authentication = {
				enabled: true,
				evaluators: {
					entitlements: `sdsa`
				}
			};

			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(false);
				done();
			});
		});

		it('that cannot be executed', done => {
			req.identity.channel.features.authentication = {
				enabled: true,
				evaluators: {
					entitlements: `function (viewer, resource) {
						if (viewer.attributes.entitlements.contains('gold') >= 0) {
							return true;
						}
						return false;
					}`
				}
			};

			res.body.data = {
				id: 'some-video',
				type: 'video',
				meta: {}
			};

			responseEntitlements({bus})(req, res, function () {
				expect(res.body.data.meta.entitled).toBe(false);
				done();
			});
		});
	});
});

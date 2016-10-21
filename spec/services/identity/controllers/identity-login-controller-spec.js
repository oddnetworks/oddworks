/* global describe, beforeAll, beforeEach, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const nock = require('nock');
const redisStore = require('../../../../lib/stores/redis/');
const identityService = require('../../../../lib/services/identity');

describe('Identity Service Controller', function () {
	let bus;
	let res;

	nock('http://auth.oddworks.io')
		.post('/login', {
			data: {
				type: 'authentication',
				attributes: {
					email: 'viewer@oddnetworks.com',
					password: 'pass12345'
				}
			}
		})
		.twice()
		.reply(200, {
			data: {
				id: 'viewer12345',
				type: 'viewer',
				attributes: {
					email: 'viewer@oddnetworks.com',
					entitlements: ['gold', 'monthly']
				},
				meta: {
					jwt: 'viewer12345_JWT'
				}
			}
		});

	nock('http://auth.oddworks.io')
		.post('/login', {
			data: {
				type: 'authentication',
				attributes: {
					email: 'bingewatcher@oddnetworks.com',
					password: 'pass12345'
				}
			}
		})
		.reply(200, {
			data: {
				id: 'viewer54321',
				type: 'viewer',
				attributes: {
					email: 'bingewatcher@oddnetworks.com',
					entitlements: ['gold', 'monthly']
				},
				meta: {
					jwt: 'viewer54321_JWT'
				}
			}
		});

	nock('http://auth.oddworks.io')
		.post('/login', {
			data: {
				type: 'authentication',
				attributes: {
					email: 'invalid@oddnetworks.com',
					password: ''
				}
			}
		})
		.reply(401);

	const CHANNEL = {
		id: 'odd-networks',
		title: 'Odd Networks',
		features: {
			authentication: {
				enabled: true,
				url: 'http://auth.oddworks.io/login'
			}
		}
	};

	const PLATFORM = {
		id: 'apple-ios',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};

	const VIEWER = {
		id: 'bingewatcher@oddnetworks.com',
		type: 'viewer',
		channel: 'odd-networks',
		enitlements: ['silver']
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform', 'viewer'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {
				jwtSecret: 'secret'
			});
		})
		.then(service => {
			this.service = service;
			this.controller = {
				login: new service.IdentityLoginController({bus})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'viewer'}, VIEWER),
				() => {}
			);
		})
		.then(done)
		.catch(this.handleError(done));
	});

	describe('proxies login', function () {
		beforeEach(function (done) {
			res = {
				status() {
				},
				body: {}
			};
			done();
		});

		it('creates a viewer on successful login', function (done) {
			const req = {
				identity: {
					channel: CHANNEL,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: 'viewer@oddnetworks.com',
					password: 'pass12345'
				}
			};

			this.controller.login.post(req, res, () => {
				expect(res.body.id).toBe('viewer@oddnetworks.com');
				expect(res.body.type).toBe('viewer');
				expect(res.body.channel).toBe('odd-networks');
				expect(res.body.entitlements.length).toBe(2);
				expect(res.body.jwt).toBeDefined();
				expect(res.body.meta.jwt).toBeDefined();

				bus.query({role: 'store', cmd: 'get', type: 'viewer'}, {id: res.body.id, channel: res.body.channel})
					.then(viewer => {
						expect(viewer.id).toBe('viewer@oddnetworks.com');
						expect(viewer.type).toBe('viewer');
						expect(viewer.channel).toBe('odd-networks');
						expect(viewer.entitlements.length).toBe(2);
						expect(viewer.meta.jwt).toBeDefined();

						done();
					});
			});
		});

		it('does not create a viewer on successful login', function (done) {
			const req = {
				identity: {
					channel: CHANNEL,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: 'viewer@oddnetworks.com',
					password: 'pass12345'
				}
			};

			this.controller.login.post(req, res, () => {
				expect(res.body.id).toBe('viewer@oddnetworks.com');
				expect(res.body.type).toBe('viewer');
				expect(res.body.channel).toBe('odd-networks');
				expect(res.body.entitlements.length).toBe(2);
				expect(res.body.jwt).toBeDefined();
				expect(res.body.meta.jwt).toBeDefined();

				bus.query({role: 'store', cmd: 'scan', type: 'viewer'}, {channel: res.body.channel})
					.then(viewers => {
						expect(viewers.length).toBe(2);
						done();
					});
			});
		});

		it('updates existing viewer we have with new entitlements after login', function (done) {
			const req = {
				identity: {
					channel: CHANNEL,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: 'bingewatcher@oddnetworks.com',
					password: 'pass12345'
				}
			};

			this.controller.login.post(req, res, () => {
				expect(res.body.id).toBe('bingewatcher@oddnetworks.com');
				expect(res.body.type).toBe('viewer');
				expect(res.body.channel).toBe('odd-networks');
				expect(res.body.entitlements.length).toBe(2);
				expect(res.body.jwt).toBeDefined();
				expect(res.body.meta.jwt).toBeDefined();
				done();
			});
		});

		it('replies with a 401 if invalid login', function (done) {
			const req = {
				identity: {
					channel: CHANNEL,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: 'invalid@oddnetworks.com',
					password: ''
				}
			};

			this.controller.login.post(req, res, err => {
				expect(err).toBeDefined();
				done();
			});
		});
	});
});

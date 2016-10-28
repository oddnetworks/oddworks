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

	const CHANNEL_PROXY = {
		id: 'odd-networks',
		title: 'Odd Networks',
		features: {
			authentication: {
				enabled: true,
				url: 'http://content.oddworks.io/v2/login',
				proxy: {
					login: 'http://auth.oddworks.io/login',
					verify: 'http://auth.oddworks.io/verify'
				}
			}
		}
	};

	const CHANNEL_EVALUATORS = {
		id: 'odd-networks-evals',
		title: 'Odd Networks',
		features: {
			authentication: {
				enabled: true,
				url: 'http://content.oddworks.io/v2/login',
				evaluators: {
					login: `function (bus, req, res, next) {
						return new Promise(function (resolve, reject) {
							if (req.body.email === '401') {
								reject({status: 401});
							} else if (req.body.email === '503') {
								reject({status: 503});
							} else if (req.body.email === 'viewer999@oddnetworks.com') {
								const viewer = {
									id: 'viewer999@oddnetworks.com',
									type: 'viewer',
									channel: req.identity.channel.id,
									email: 'viewer999@oddnetworks.com',
									entitlements: ['allowed'],
									meta: {
										source: 'evaluator'
									}
								};

								return resolve(viewer);
							}
						});
					}`
				}
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
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL_PROXY),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL_EVALUATORS),
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
					channel: CHANNEL_PROXY,
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
					channel: CHANNEL_PROXY,
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
					channel: CHANNEL_PROXY,
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
					channel: CHANNEL_PROXY,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: 'invalid@oddnetworks.com',
					password: ''
				}
			};

			this.controller.login.post(req, res, err => {
				expect(err.output.statusCode).toBe(401);
				done();
			});
		});
	});

	describe('evaluator login', function () {
		it('creates a viewer on successful login', function (done) {
			const req = {
				identity: {
					channel: CHANNEL_EVALUATORS,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: 'viewer999@oddnetworks.com',
					password: 'pass12345'
				}
			};

			this.controller.login.post(req, res, () => {
				expect(res.body.id).toBe('viewer999@oddnetworks.com');
				expect(res.body.type).toBe('viewer');
				expect(res.body.channel).toBe('odd-networks-evals');
				expect(res.body.entitlements.length).toBe(1);
				expect(res.body.jwt).toBeDefined();
				expect(res.body.meta.source).toBe('evaluator');
				done();
			});
		});

		it('replies with a 401 if invalid login', function (done) {
			const req = {
				identity: {
					channel: CHANNEL_EVALUATORS,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: '401',
					password: ''
				}
			};

			this.controller.login.post(req, res, err => {
				expect(err.isBoom).toBe(true);
				expect(err.output.statusCode).toBe(401);
				done();
			});
		});

		it('replies with a 503 from upstream server', function (done) {
			const req = {
				identity: {
					channel: CHANNEL_EVALUATORS,
					platform: PLATFORM
				},
				body: {
					type: 'authentication',
					email: '503',
					password: ''
				}
			};

			this.controller.login.post(req, res, err => {
				expect(err.isBoom).toBe(true);
				expect(err.output.statusCode).toBe(503);
				done();
			});
		});
	});
});

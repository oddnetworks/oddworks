const config = require('./config');
const opbeat = require('opbeat');
const seneca = require('seneca');
const deviceAuth = require('@oddnetworks/seneca-odd-auth');
const identity = require('@oddnetworks/seneca-odd-identity');
const catalog = require('@oddnetworks/seneca-odd-catalog');
const entitlement = require('@oddnetworks/seneca-odd-entitlement');
const events = require('./services/seneca-odd-events');
// const device	 = require('device');
const express = require('express');
const decorateExpressWithMiddleware = require('./middleware');
const decorateExpressWithRoutes = require('./routes');
const formatter = require('./lib/response-formatter');
const async = require('async');
const _ = require('lodash');
const boom = require('boom');

opbeat.start(config.opbeat);

/*
	*******************
	Service Definition
	*******************
*/

const OddDeviceService = function () {
	this.config = config;
	this.organizations = this.config.organizations;
};

OddDeviceService.prototype = {
	init: function (options) {
		_.bindAll(this, [
			'seneca',
			'express'
		]);

		// Allows us to inject a different instance of seneca for testing
		if (_.get(options, 'seneca')) {
			this.seneca = options.seneca;
		}

		// Allows us to inject a different instance of express for testing
		if (_.get(options, 'express')) {
			this.memoizedExpress = options.express;
		}

		return this;
	},
	start: function () {
		var self = this;

		this.express().set('seneca', this.seneca());
		this.express().set('config', this.config);

		this.seneca().add({init: 'device'}, function (args, done) {
			async.series([
				function (next) {
					if (self.config.env === 'test') {
						return next();
					}

					self.express().listen(self.config.main.port, function listen() {
						/* eslint-disable */
						console.log('App is now listening on port ', this.address().port);
						/* eslint-enable */
						next();
					});
				}
			], done);
		});
	},
	seneca: function () {
		var self = this;
		if (this.memoizedSeneca) {
			return this.memoizedSeneca;
		}

		var instance = seneca(config);

		if (config.env === 'staging' || config.env === 'production') {
			instance.use('mongo-store');
			instance.use('redis-cache');
		} else {
			instance.use('mem-store');
			instance.use('cache');
		}

		instance.use({init: identity, name: 'identity'});
		instance.use({init: catalog, name: 'catalog'});
		instance.use({init: deviceAuth, name: 'device-auth'});
		instance.use({init: entitlement, name: 'entitlement'});
		instance.use({init: events, name: 'events'});
		instance.use({name: 'device', init: function () {
			instance.add({init: 'device'}, function (args, done) {
				var cb = function (next) {
					next();
				};

				var devCatalogSeed = self.config.env === 'development' ? this.next_act({role: 'catalog', cmd: 'seed'}) : cb;
				var devIdentitySeed = self.config.env === 'development' ? this.next_act({role: 'identity', cmd: 'seed'}) : cb;

				async.series([
					devIdentitySeed,
					devCatalogSeed,
					function (next) {
						if (self.config.env === 'test') {
							return next();
						}

						self.express().listen(self.config.main.port, function listen() {
							/* eslint-disable */
							console.log('App is now listening on port ', this.address().port);
							/* eslint-enable */
							next();
						});
					}
				], done);
			});
		}});

		this.memoizedSeneca = instance;

		return this.memoizedSeneca;
	},
	express: function () {
		if (this.memoizedExpress) {
			return this.memoizedExpress;
		}

		// Setup Express
		var instance = express();
		decorateExpressWithMiddleware(instance);
		decorateExpressWithRoutes(instance);

		instance.use(function handleNoRoute(req, res, next) {
			// Route not found - a.k.a an actual 404
			next(boom.notFound());
		});
		instance.use(function handleError(err, req, res, next) {
			if (err) {
				var statusCode = (err.output) ? err.output.statusCode : (err.status || 500);
				res.status(statusCode || 500);

				if (!statusCode || statusCode === 500) {
					opbeat.captureError(err, {
						extras: {
							organization: req.identity.organization.id,
							device: req.identity.device.deviceType
						}
					});
				}

				if (!_.has(err, 'output.payload')) {
					err = boom.wrap(err, err.status);
				}

				res.body = err.output.payload;
				formatter(res);
			} else {
				next();
			}
		});

		this.memoizedExpress = instance;

		return this.memoizedExpress;
	}
};

const oddDeviceService = new OddDeviceService();

module.exports = oddDeviceService;

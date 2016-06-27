'use strict';

const http = require('http');

const Promise = require('bluebird');
const _ = require('lodash');
const express = require('express');

// bus - Oddcast Bus Object
// options.host - String
// options.port - Number
// options.app - Express application instance Object
// options.trustProxy - Boolean | String | Array
//                      http://expressjs.com/en/guide/behind-proxies.html
module.exports = function (bus, options) {
	if (!bus || !_.isObject(bus)) {
		throw new Error('The bus must be the first argument.');
	}

	options = _.defaults({}, options, {
		host: '0.0.0.0',
		port: 3000,
		trustProxy: 'loopback'
	});

	const port = options.port;
	const host = options.host;
	const app = options.app || express();
	const server = http.createServer(app);

	const service = {
		name: 'server',
		options,
		host,
		port,
		app,
		server
	};

	app.set('trust proxy', options.trustProxy);

	return new Promise((resolve, reject) => {
		server.on('error', err => {
			// If it is not a socket listen error, then rethrow.
			if (err.syscall !== 'listen') {
				return reject(err);
			}

			// Handle specific listen errors with friendly messages
			switch (err.code) {
				case 'EACCES':
					err = new Error(`port ${port} requires elevated privileges`);
					break;
				case 'EADDRINUSE':
					err = new Error(`port ${port} is already in use`);
					break;
				default:
					bus.broadcast({level: 'error', event: 'server-start-error'}, {
						message: `error starting server on ${host}:${port}`,
						error: err
					});
			}

			reject(err);
		});

		server.on('listening', () => {
			const addr = server.address();
			bus.broadcast({level: 'info', event: 'server-started'}, {
				message: `server listening on ${addr.address}:${addr.port}`
			});
			resolve(service);
		});

		server.listen(port, host);
	});
};

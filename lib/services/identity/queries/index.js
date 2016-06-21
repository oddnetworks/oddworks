'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

Promise.promisifyAll(jwt);

module.exports = function (service) {
	const queries = Object.create(null);

	const options = _.defaults({}, service.options, {
	});

	const JWT_SECRET = options.jwtSecret;
	const JWT_ISSUER = options.jwtIssuer;

	queries.verify = function verify(args) {
		const token = args.token;

		return jwt
			.verifyAsync(token, JWT_SECRET, {issuer: JWT_ISSUER})
			.then(object => {
				const role = 'store';
				const cmd = 'get';
				const channelId = object.channel;
				const platformId = object.platform;
				const userId = object.user;
				const subject = object.sub;

				if (!channelId) {
					throw new Error('JSON Web Token has no channel.');
				}

				if (subject) {
					return service.bus
						.query({role, cmd, type: 'channel'}, {id: channelId})
						.then(channel => {
							if (!channel) {
								throw new Error(`Channel ${channelId} not found.`);
							}
							return {subject, channel};
						});
				} else if (userId && platformId) {
					return Promise
						.all([
							service.bus.query({role, cmd, type: 'channel'}, {id: channelId}),
							service.bus.query({role, cmd, type: 'platform'}, {id: platformId}),
							service.bus.query({role, cmd, type: 'user'}, {id: userId})
						])
						.then(results => {
							const channel = results[0];
							const platform = results[1];
							const user = results[2];

							if (!channel) {
								throw new Error(`Channel ${channelId} not found.`);
							}
							if (!platform) {
								throw new Error(`Platform ${platformId} not found.`);
							}
							if (!user) {
								throw new Error(`User ${userId} not found.`);
							}

							return {channel, platform, user};
						});
				} else if (platformId) {
					return Promise
						.all([
							service.bus.query({role, cmd, type: 'channel'}, {id: channelId}),
							service.bus.query({role, cmd, type: 'platform'}, {id: platformId})
						])
						.then(results => {
							const channel = results[0];
							const platform = results[1];

							if (!channel) {
								throw new Error(`Channel ${channelId} not found.`);
							}
							if (!platform) {
								throw new Error(`Platform ${platformId} not found.`);
							}

							return {channel, platform};
						});
				}

				throw new Error('JSON Web Token has no subject or platform.');
			});
	};

	queries.composeConfig = function composeConfig(args) {
		args = args || {};
		const channel = args.channel || {};
		const platform = args.platform || {};

		const meta = _.mergeDeep({}, channel, platform);
		meta.user = args.user || null;

		return Promise.resolve(meta);
	};

	return queries;
};

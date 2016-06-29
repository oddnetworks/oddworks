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

	// args.token - String *required*
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
				const audience = object.aud || [];

				const isAdmin = audience.indexOf('admin') >= 0;

				if (!isAdmin && !channelId) {
					throw new Error('JSON Web Token has no channel.');
				}

				if (subject && channelId) {
					return service.bus
						.query({role, cmd, type: 'channel'}, {id: channelId})
						.then(channel => {
							if (!channel) {
								throw new Error(`Channel ${channelId} not found.`);
							}
							return {audience, subject, channel};
						});
				} else if (subject) {
					return {audience, subject};
				} else if (userId && platformId) {
					return Promise
						.all([
							service.bus.query({role, cmd, type: 'channel'}, {id: channelId}),
							service.bus.query(
								{role, cmd, type: 'platform'},
								{id: platformId, channel: channelId}
							),
							service.bus.query(
								{role, cmd, type: 'user'},
								{id: userId, channel: channelId}
							)
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

							return {audience, channel, platform, user};
						});
				} else if (platformId) {
					return Promise
						.all([
							service.bus.query({role, cmd, type: 'channel'}, {id: channelId}),
							service.bus.query(
								{role, cmd, type: 'platform'},
								{id: platformId, channel: channelId}
							)
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

							return {audience, channel, platform};
						});
				}

				throw new Error('JSON Web Token has no subject or platform.');
			});
	};

	// args.audience - Array of Strings *required*
	// args.subject - String *required if admin*
	// args.channel - String *required if non admin*
	// args.platform - String *required if non admin*
	// args.user - String
	queries.sign = function sign(args) {
		args = args || {};

		if (!Array.isArray(args.audience)) {
			throw new Error('args.audience Array is required');
		}

		const isAdmin = args.audience.indexOf('admin') >= 0;

		if (!isAdmin && !args.channel) {
			throw new Error('args.channel String is required');
		}

		const options = {
			issuer: JWT_ISSUER,
			audience: args.audience
		};

		const payload = {};
		if (args.channel) {
			payload.channel = args.channel;
		}

		if (args.subject) {
			options.subject = args.subject;
		} else if (args.platform && args.user) {
			payload.platform = args.platform;
			payload.user = args.user;
		} else if (args.platform) {
			payload.platform = args.platform;
		} else {
			throw new Error('args.subject or args.platform is required');
		}

		return new Promise((resolve, reject) => {
			jwt.sign(payload, JWT_SECRET, options, (err, token) => {
				if (err) {
					return reject(err);
				}

				resolve(token);
			});
		});
	};

	queries.composeConfig = function composeConfig(args) {
		args = args || {};
		const channel = args.channel || {};
		const platform = args.platform || {};

		const omittedKeys = [
			'id',
			'type',
			'user',
			'channel',
			'platform',
			'updatedAt'
		];

		const meta = _.merge(
			{},
			_.omit(channel, omittedKeys),
			_.omit(platform, omittedKeys)
		);

		meta.user = args.user || null;

		return Promise.resolve(meta);
	};

	return queries;
};

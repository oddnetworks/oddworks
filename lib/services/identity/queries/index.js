'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

module.exports = function (service) {
	const queries = Object.create(null);

	const options = _.defaults({}, service.options, {
	});

	const JWT_SECRET = options.jwtSecret;
	const JWT_ISSUER = options.jwtIssuer;

	// args.token - String *required*
	queries.verify = args => {
		const token = args.token;

		return new Promise((resolve, reject) => {
			try {
				const object = jwt.verify(token, JWT_SECRET, {issuer: JWT_ISSUER});
				const role = 'store';
				const cmd = 'get';
				const channelId = object.channel;
				const platformId = object.platform;
				const viewerId = object.viewer;
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
							return resolve({audience, subject, channel});
						});
				} else if (subject) {
					return resolve({audience, subject});
				} else if (viewerId && platformId) {
					return Promise
						.all([
							service.bus.query({role, cmd, type: 'channel'}, {id: channelId}),
							service.bus.query(
								{role, cmd, type: 'platform'},
								{id: platformId, channel: channelId}
							),
							service.bus.query(
								{role, cmd, type: 'viewer'},
								{id: viewerId, channel: channelId}
							)
						])
						.then(results => {
							const channel = results[0];
							const platform = results[1];
							const viewer = results[2];

							if (!channel) {
								throw new Error(`Channel ${channelId} not found.`);
							}
							if (!platform) {
								throw new Error(`Platform ${platformId} not found.`);
							}
							if (!viewer) {
								throw new Error(`User ${viewerId} not found.`);
							}

							return resolve({audience, channel, platform, viewer});
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

							return resolve({audience, channel, platform});
						});
				}

				throw new Error('JSON Web Token has no subject or platform.');
			} catch (err) {
				reject(err);
			}
		});
	};

	// args.audience - Array of Strings *required*
	// args.subject - String *required if admin*
	// args.channel - String *required if non admin*
	// args.platform - String *required if non admin*
	// args.viewer - String
	// args.secret - String
	// args.issuer - String
	queries.sign = args => {
		args = args || {};
		const secret = args.secret || JWT_SECRET;
		const issuer = args.issuer || JWT_ISSUER;

		if (!Array.isArray(args.audience)) {
			throw new Error('args.audience Array is required');
		}

		const isAdmin = args.audience.indexOf('admin') >= 0;

		if (!isAdmin && !args.channel) {
			throw new Error('args.channel String is required');
		}

		const options = {issuer, audience: args.audience};

		const payload = {};
		if (args.channel) {
			payload.channel = args.channel;
		}

		if (args.subject) {
			options.subject = args.subject;
		} else if (args.platform && args.viewer) {
			payload.platform = args.platform;
			payload.viewer = args.viewer;
		} else if (args.platform) {
			payload.platform = args.platform;
		} else {
			throw new Error('args.subject or args.platform is required');
		}

		return new Promise((resolve, reject) => {
			try {
				const token = jwt.sign(payload, secret, options);
				return resolve(token);
			} catch (err) {
				return reject(err);
			}
		});
	};

	queries.composeConfig = args => {
		args = args || {};
		const channel = args.channel || {};
		const platform = args.platform || {};

		const omittedKeys = [
			'id',
			'type',
			'viewer',
			'channel',
			'platform',
			'updatedAt',
			'secrets'
		];

		const config = _.merge(
			{},
			_.omit(channel, omittedKeys),
			_.omit(platform, omittedKeys),
			{type: 'config', id: `${channel.id}-${platform.id}`}
		);

		config.channel = channel.id;
		config.platform = platform.id;
		config.viewer = args.viewer || null;
		return Promise.resolve(config);
	};

	return queries;
};

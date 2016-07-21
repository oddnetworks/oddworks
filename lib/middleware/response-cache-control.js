'use strict';

const _ = require('lodash');

module.exports = function (options) {
	options = options || {surrogateKey: false};

	const header = [
		'public',
		`max-age=${options.maxAge || 600}`,
		`stale-while-revalidate=${options.staleWhileRevalidate || 604800}`,
		`stale-if-error=${options.staleIfError || 604800}`
	].join(', ');

	return function responseCacheControl(req, res, next) {
		res.set('Cache-Control', header);

		if (options.surrogateKey) {
			res.set('Surrogate-Key', composeSurrogateKey(req, res));
		}

		next();
	};
};

function composeSurrogateKey(req, res) {
	const channel = req.identity.channel.id;
	const platform = req.identity.platform.id;

	let surrogateKey = [
		channel,
		platform,
		`${channel}:${platform}`
	];

	if (Array.isArray(res.body)) {
		const ids = [];
		const types = [];

		_.each(res.body, item => {
			ids.push(`${channel}:${item.id}`, `${channel}:${platform}:${item.id}`, item.id);
			types.push(item.type);
		});
		surrogateKey = surrogateKey.concat(ids);
		surrogateKey = surrogateKey.concat(
			_(types)
			.uniq()
			.map(type => {
				return [`${channel}:${type}`, `${channel}:${platform}:${type}`, type];
			})
			.flatten()
			.value()
		);
	} else {
		surrogateKey = surrogateKey.concat([`${channel}:${res.body.type}`, `${channel}:${platform}:${res.body.type}`, res.body.type]);
		surrogateKey = surrogateKey.concat([`${channel}:${res.body.id}`, `${channel}:${platform}:${res.body.id}`, res.body.id]);
	}

	return surrogateKey.join(' ');
}

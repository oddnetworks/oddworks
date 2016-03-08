'use strict';
var boom = require('boom');
var send = require('../lib/response-send.js');
var Promise = require('bluebird');
var LRU = require('lru-cache')({max: 500, maxAge: 1000 * 60 * 5});
var _ = require('lodash');
// Sets the max items in the cache to 500 and max age
// of each item to 5 minutes.

module.exports = {
	post: function (req, res, next) {
		var seneca = req.app.get('seneca');
		var act = Promise.promisify(seneca.act, seneca);

		if (!req.body.type || req.body.type !== 'event' ||
			!req.body.attributes ||
			!req.body.attributes.action || req.body.attributes.action === '') {
			return next(boom.badData('Missing one of: [`type`, `attributes.action`]', req.body));
		}
		if (req.body.attributes.contentType === 'video' && _.startsWith(req.body.attributes.action, 'video:')) {
			var cachedVideo = LRU.get(req.body.attributes.contentId);
			// if video is in cache, get title and duration from the cached video
			if (cachedVideo) {
				req.body.attributes.title = cachedVideo.title;
				req.body.attributes.duration = cachedVideo.duration;
				success(req, res, next);
				act({role: 'events', cmd: 'log', req: req});
			} else {
				act({role: 'catalog', cmd: 'fetchVideo', id: req.body.attributes.contentId})
					.then(function (video) {
						if (!video) {
							return next(boom.notFound());
						}
						req.body.attributes.title = video.title;
						// if client sends duration, use that. otherwise, use the catalog duration
						req.body.attributes.duration = req.body.attributes.duration || video.duration;
						LRU.set(req.body.attributes.contentId, video);

						success(req, res, next);
						act({role: 'events', cmd: 'log', req: req});

						return Promise.resolve(req);
					})
					.catch(function (err) {
						return next(boom.wrap(err, 'Event Not Logged'));
					});
			}
		} else {
			success(req, res, next);
			act({role: 'events', cmd: 'log', req: req});
		}
	}
};

function success(req, res, next) {
	// Log it
	console.log('Event Received (' + req.get('X-Real-IP') + '): ' + JSON.stringify(req.body));
	// Drop mic - Return a 201 always for events, regardless of whether we do
	// anything with them.
	req.data = req.body.attributes;
	res.status(201);

	return send(null, req, res, next);
}

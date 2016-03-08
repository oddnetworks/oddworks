var redis = require('redis');
var redisMock = require('redis-mock');
var SEPARATOR = '::';
var moment = require('moment');
var EVENTSTAG = 'EVENTS:';
var config = require('../config');
var Mixpanel = require('mixpanel');
var ua = require('universal-analytics');
var _ = require('lodash');

module.exports = function (options) {
	var seneca = this;
	var plugin = 'events';
	var cache;

	seneca.add('init:' + plugin, function (msg, done) {
		if (config.env === 'production' || config.env === 'staging') {
			cache = redis.createClient(options.redisUri);
		} else {
			cache = redisMock.createClient();
		}

		if (options.cleanupInterval) {
			setInterval(function () {
				roomba(cache, seneca);
			}, options.cleanupInterval);
		}

		done();
	});

	seneca.add({role: plugin, cmd: 'log'}, function (args, done) {
		var key = generateSessionKey(args.req);
		var payload = args.req.body;
		var action = args.req.body.attributes.action;
		var contentType = args.req.body.attributes.contentType;
		var timestamp = new Date().getTime();
		payload.distinctId = args.req.get('X-Real-IP');
		payload.identity = args.req.identity;
		payload.geoId = args.req.get('X-Geo-Country-Code');
		payload.ip = args.req.get('X-Real-IP');
		payload.userAgent = args.req.get('User-Agent');
		payload.xUserAgent = args.req.get('X-User-Agent');
		// attach the current timestamp to the event payload
		payload.timestamp = timestamp;
		// create or update the session with whatever elapsed time
		if (contentType === 'liveStream' || contentType === 'video') {
			// on video:play store a session with the current timestamp and no elapsed time
			if (action === 'video:play') {
				// error checking for cases where we get two video start beacons
				// and never got a stop
				cache.get(EVENTSTAG + key, function (err, result) {
					if (err) {
						return done(err);
					}
					if (result) {
						result = JSON.parse(result);
						// if the session had playing info send it otherwise do nothing
						if (result.attributes.elapsed !== 0) {
							result.attributes.action = 'video:stop';
							send(result);
						}
					}
				});
				payload.attributes.elapsed = 0;
				send(payload);
				cache.set(EVENTSTAG + key, JSON.stringify(payload));

				// Clusters keys by hour. There will be 24 sets of keys. One for
				// each hour of the day. This will assist in cleaning up later.
				cache.sadd(EVENTSTAG + moment().get('hour'), EVENTSTAG + key);

			// on video:playing update or set a session with the elapsed time
			} else if (action === 'video:playing') {
				// if there is a current session with playing info that is
				// less than the sent elapsed time, add them together
				cache.get(EVENTSTAG + key, function (err, result) {
					if (err) {
						return done(err);
					}
					if (result) {
						result = JSON.parse(result);
						if (payload.attributes.elapsed) {
							if (parseInt(payload.attributes.elapsed, 10) < parseInt(result.attributes.elapsed, 10)) {
								result.attributes.action = 'video:stop';
								send(result);
							}
						} else {
							// if playing beacons don't have elapsed attached, use the time stamp to set elapsed
							// to the time between playing events + the old time elapsed
							payload.attributes.elapsed = parseInt(result.attributes.elapsed, 10) + ((new Date().getTime()) - parseInt(result.timestamp, 10));
						}
					} else {
						// if playing beacon with no elapsed, set elapsed to 0
						payload.attributes.elapsed = 0;
						cache.sadd(EVENTSTAG + moment().get('hour'), EVENTSTAG + key);
					}
					cache.set(EVENTSTAG + key, JSON.stringify(payload));
				});

			// lastly on video:stop pull the key do some maths and send to Mixpanel
			} else if (action === 'video:stop') {
				cache.get(EVENTSTAG + key, function (err, result) {
					if (err) {
						return done(err);
					// checks to make sure result exists (eg, two stops in a row)
					} else if (!result) {
						return done(new Error('Received video:stop with no previous video:play'));
					// some devices aren't attaching elapsed times to video:stop events
					// this will give them the last playing elapsed
					} else if (!payload.attributes.elapsed) {
						result = JSON.parse(result);
						payload.attributes.elapsed = result.attributes.elapsed;
						send(payload);
					// if video:stop has elapsed attached, send payload as is
					} else {
						send(payload);
					}
				});

				cache.del(EVENTSTAG + key);
			} else if (action === 'video:error') {
				send(payload);
			}
		} else if (action === 'video:playing') {
			// do nothing
		} else {
			send(payload);
		}

		done(null, {});
	});

	return {name: plugin};
};

function generateSessionKey(req) {
	return [req.sessionId, req.body.attributes.contentId].join(SEPARATOR);
}

function send(payload) {
	if (payload.attributes.elapsed && payload.identity.device.deviceType !== 'MICROSOFT_XBOX360') {
		payload.attributes.elapsed = parseInt(payload.attributes.elapsed, 10) / config.events.timeMultiplier;
	}
	mixPanelTrack(payload);
	googleAnalyticsTrack(payload);
}

// For the past 8 (offset by 1) hours, roomba gets all keys that remain
// and sends the corresponding data to mixpanel and deletes it from redis
function roomba(cache, seneca) {
	var startHour = moment().get('hour');
	var currHour;
	startHour -= 12;
	for (var i = startHour; i < (startHour + 8); i++) {
		// if the hour is negative we need to transform
		if (i < 0) {
			currHour = i + 24;
		} else {
			currHour = i;
		}
		cache.smembers(EVENTSTAG + currHour, memoryIterator);
		cache.del(EVENTSTAG + currHour);
	}
	function memoryIterator(err, result) {
		if (err) {
			seneca.log.debug('roomba', err);
		}
		result.forEach(function (reply) {
			cache.get(reply, function (err, toSend) {
				if (err) {
					seneca.log.debug('roomba', err);
				}
				if (toSend) {
					toSend = JSON.parse(toSend);
					toSend.attributes.action = 'video:stop';
					send(toSend);
				}
			});
			cache.del(reply);
		});
	}
}

// Mixpanel
function mixPanelTrack(payload) {
	if (!_.has(payload, 'identity.organization.mixpanelId')) {
		return false;
	}

	// Hack: Just doing this to test in production with actual data See @BJC
	var mixpanel = Mixpanel.init(payload.identity.organization.mixpanelId);

	// HACK: The 360 isn't sending contentType and contentId for video:play events
	//			 If they don't send it, don't send the ping, and use the reacharound hack for now
	if (payload.identity.device.deviceType === 'MICROSOFT_XBOX360' && payload.attributes.action === 'video:play') {
		if (!payload.attributes.contentType || !payload.attributes.contentId) {
			return false;
		}
	}
	var statsPackage = {
			/*eslint-disable */
		'distinct_id': payload.distinctId,
		'device_type': payload.identity.device.deviceType,
		'organization_id': payload.identity.organization.id,
		'content_type': payload.attributes.contentType,
		'content_id': payload.attributes.contentId,
		'geo_id': payload.geoId,
		'ip': payload.ip,
		'user_agent': payload.userAgent,
		'x_user_agent': payload.xUserAgent,
		'Video Title': payload.attributes.title
			/*eslint-enable */
	};
	if (payload.identity.device.category) {
		statsPackage.Category = payload.identity.device.category;
	}
	if (payload.attributes.elapsed) {
		statsPackage['Time Watched'] = payload.attributes.elapsed;
	}
	if (payload.attributes.duration && payload.attributes.duration !== 0) {
		payload.attributes.duration = parseInt(payload.attributes.duration, 10) / config.events.timeMultiplier;
		statsPackage.duration = payload.attributes.duration;
	}
	if (payload.attributes.duration && payload.attributes.duration !== 0 && payload.attributes.elapsed && payload.attributes.contentType === 'video') {
		statsPackage['Completion Percentage'] = getPercentage(parseInt(payload.attributes.elapsed, 10) / parseInt(payload.attributes.duration, 10));
	}
	mixpanel.track(payload.attributes.action, statsPackage);

	// Only set this if it doesn't exist
	mixpanel.people.set_once(payload.ip, {
		/*eslint-disable */
		$first_name: 'Anonymous',
		ip: payload.ip
		/*eslint-enable */
	});
}

// rounds up to nearest multiple of 5 and returns in % form
function getPercentage(toRound) {
	toRound *= 100;
	var toReturn = Math.ceil(toRound / 5) * 5;
	if (toReturn > 100) {
		toReturn = 100;
	}
	return toReturn;
}

// Google Analytics
function googleAnalyticsTrack(payload) {
	if (!_.has(payload, 'identity.organization.gaTrackingId')) {
		return false;
	}

	var action = payload.attributes.action.split(':');
	var screen;
	if (payload.attributes.contentType && payload.attributes.contentId) {
		screen = payload.attributes.contentType + '-' + payload.attributes.contentId;
	}

	var visitor = ua(payload.identity.organization.gaTrackingId, payload.sessionId, {https: true, strictCidFormat: false});
	var params = {
		t: 'event',
		av: payload.identity.device.deviceType,
		an: payload.identity.organization.id,
		ds: 'app',
		ec: action[0],
		ea: action[1],
		cd: screen,
		geoid: payload.geoId,
		uip: payload.ip,
		ua: payload.userAgent
	};

	visitor.event(params, function (err) {
		if (err) {
			console.error('Universal Analytics Error: GaTrackingId:' + payload.identity.organization.gaTrackingId + ' SessionId: ' + payload.sessionId + ' Error:' + (err.description || err.message || err) + JSON.stringify(params));
			return err;
		}
		console.log('Universal Analytics Success: GaTrackingId:' + payload.identity.organization.gaTrackingId + ' SessionId: ' + payload.sessionId + ' Payload:' + JSON.stringify(params));
	});
}

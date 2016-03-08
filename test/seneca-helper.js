'use strict';

process.env.NODE_ENV = 'test';

var _ = require('lodash');
var config	 = _.cloneDeep(require('../config'));
var async		= require('async');
var identity	= require('@oddnetworks/seneca-odd-identity');
var catalog	= require('@oddnetworks/seneca-odd-catalog');
var events = require('../services/seneca-odd-events');

config.events.cleanupInterval = false;

var seneca	 = require('seneca')(config);

// Remove the mem-store here, if we want to use a mock catalog (its not needed)
seneca.use('mem-store');

// Remove the catalog here, and install a mock one.
seneca.use({init: identity, name: 'identity'});
seneca.use({init: catalog, name: 'catalog'});
seneca.use({init: events, name: 'events'});
seneca.use({name: 'device', init: function () {
	seneca.add({init: 'device'}, function (args, done) {
		async.series([
			// Remove the catalog here, and install a mock one.
			this.next_act({role: 'identity', cmd: 'seed'}),
			this.next_act({role: 'catalog', cmd: 'seed'})
		], done);
	});
}});

var deviceUserProfile = {
	id: '56099956dcf43b1100a26fc9',
	organizationID: 'odd-networks',
	deviceType: 'ROKU_ROKU',
	clientUserID: '123456',
	clientProfile: {
		/* eslint-disable */
		user_id: '123456',
		/* eslint-enable */
		type: 'subscription',
		rid: 'ABCD'
	},
	accessToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJzY29wZSI6WyJ1c2VyIl0sInVpZCI6IjEyMzQ1NiIsImVudGl0bGVtZW50cyI6W3sidXNlcl9pZCI6IjEyMzQ1NiIsInR5cGUiOiJzdWJzY3JpcHRpb24iLCJyaWQiOiJBQkNEIn1dLCJqdGkiOiI5MTJlZmI5Ny04ODVhLTQ5N2UtODZmOC01YmRkZWIxZTVkOWMiLCJpYXQiOjE0NDM0Njk2NTd9.g3PWRcqg-AwUp31u6IJYouc1qKEOBhXWpG8-9QP5acA',
	jti: '912efb97-885a-497e-86f8-5bddeb1e5d9c'
};

seneca.ready(function onReady() {
	seneca.add({role: 'device-auth', cmd: 'fetchDeviceUserProfile'}, function (args, done) {
		// hack. better way to mock seneca action? @TQ
		if (args.jti === '912efb97-885a-497e-86f8-5bddeb1e5d9c') {
			done(null, deviceUserProfile);
		} else {
			done('error', null);
		}
	});

	seneca.add({role: 'device-auth', cmd: 'fetchConfig'}, function (args, done) {
		if (args.organization === 'levintv') {
			done(null, {
				id: 'levintv',
				userCodeExpiresIn: 1800,
				accessTokenRequestInterval: 5,
				verificationUrl: {
					ROKU_ROKU: 'https://odd-auth-reference.herokuapp.com/device/link/roku',
					AMAZON_FIRETV: 'https://odd-auth-reference.herokuapp.com/device/link/firetv',
					APPLE_IOS: 'https://odd-auth-reference.herokuapp.com/device/link/ios',
					GOOGLE_ANDROID: 'https://odd-auth-reference.herokuapp.com/device/link/android',
					MICROSOFT_XBOXONE: 'https://odd-auth-reference.herokuapp.com/device/link/xboxone'
				}
			});
		} else {
			done(null, null);
		}
	});

	seneca.add({role: 'entitlement', cmd: 'verify'}, function (args, done) {
		// hack hack. better way to mock seneca action? @TQ
		if (args.entitlementCredentials.uid === '12345') {
			done(null, ['Subscription']);
		} else if (args.entitlementCredentials.uid === '67890') {
			done(null, []);
		} else {
			done('error', null);
		}
	});

	seneca.add({role: 'identity', cmd: 'fetchOrganization'}, function (args, done) {
		done(null, {
			id: 'odd-networks',
			features: {
				overlays: {
					enabled: true,
					url: 'http://example.com/image.png'
				},
				player: {
					enabled: true,
					type: 'ooyala',
					pCode: 'pee-code',
					domain: 'ooyala.com'
				}
			}
		});
	});

	seneca.add({role: 'identity', cmd: 'fetchDevice'}, function (args, done) {
		done(null, {
			id: 'device-id',
			organization: 'odd-networks',
			deviceType: 'MICROSOFT_XBOX360',
			features: {
				ads: {
					enabled: true,
					provider: 'prisonsquare',
					url: 'http://prisonsquare.com/vmap.xml?mediaId={meta.sourceId}'
				}
			},
			views: {
				homepage: '2a181af0-eea5-4a11-8c5a-3c2d146657d7'
			}
		});
	});

	seneca.add({role: 'catalog', cmd: 'fetchVideo', id: '999'}, function (args, done) {
		done(null, {
			id: '999',
			organization: 'odd-networks',
			title: 'test'
		});
	});
});

module.exports = function () {
	return seneca;
};

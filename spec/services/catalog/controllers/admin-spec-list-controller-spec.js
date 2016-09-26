/* global describe, beforeAll, xdescribe */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const Promise = require('bluebird');
const fakeredis = require('fakeredis');
const redisStore = require('../../../../lib/stores/redis/');
const catalogService = require('../../../../lib/services/catalog');
const identityService = require('../../../../lib/services/identity');

describe('Catalog Service fetchItem', function () {
	let bus;

	const CHANNEL = {
		id: 'odd-networks',
		type: 'channel',
		title: 'Odd Networks'
	};

	const PLATFORM = {
		id: 'apple-ios',
		type: 'platform',
		title: 'Apple iOS',
		channel: 'odd-networks'
	};

	const USER = {
		id: 'user-id',
		type: 'user',
		title: 'User',
		channel: 'odd-networks'
	};

	const COLLECTION_SPEC = {
		id: 'collection-13-spec',
		type: 'collectionSpec',
		source: 'testProvider',
		channel: 'odd-networks'
	};

	// TODO: two more specs will be needed to test the number of colelction-specs recieved

	const COLLECTION_SPEC_DELETE = {
		id: 'collection-13-spec-delete',
		type: 'collectionSpec',
		source: 'testProvider',
		channel: 'odd-networks'
	};

	beforeAll(function (done) {
		bus = this.createBus();
		this.service = null;

		bus.queryHandler(
			{role: 'provider', cmd: 'get', source: 'testProvider'},
			() => {
				return Promise.resolve({
					title: 'Foo',
					description: 'Bar'
				});
			}
		);

		Promise.promisifyAll(fakeredis.RedisClient.prototype);
		Promise.promisifyAll(fakeredis.Multi.prototype);

		// Initialize a store
		redisStore(bus, {
			types: ['channel', 'platform', 'user', 'collectionSpec', 'collection'],
			redis: fakeredis.createClient()
		})
		.then(store => {
			this.store = store;
		})
		// Initialize an identity service
		.then(() => {
			return identityService(bus, {});
		})
		// Initialize the catalog service
		.then(() => {
			return catalogService(bus, {
				updateFrequency: 1
			});
		})
		.then(service => {
			this.service = service;
			this.controller = {
				spec: new this.service.CatalogSpecController({bus, type: 'collectionSpec'})
			};
		})
		.then(() => {
			return Promise.join(
				bus.sendCommand({role: 'store', cmd: 'set', type: 'channel'}, CHANNEL),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'platform'}, PLATFORM),
				bus.sendCommand({role: 'store', cmd: 'set', type: 'user'}, USER),
				bus.sendCommand({role: 'catalog', cmd: 'setItemSpec', type: 'collection'}, COLLECTION_SPEC),
				bus.sendCommand({role: 'catalog', cmd: 'setItemSpec', type: 'collection'}, COLLECTION_SPEC_DELETE),
				() => {}
			);
		})
		.then(done)
		.catch(done.fail);
	});

	xdescribe('Admin POST correctly inserts a spec object');

	xdescribe('Admin GET retrieves all preset specs a spec object');
});

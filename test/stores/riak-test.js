'use strict';

const test = require('tape');
const before = test;
const after = test;

const Riak = require('basho-riak-client');

const bus = require('../support/test-helper').bus;
const oddworks = require('../../lib/oddworks');
const riakStore = oddworks.stores.riak;

let riakClient;

before('setup riak client and store', t => {
	riakClient = new Riak.Client(['127.0.0.1:8087']);
	riakStore.initialize(bus, {riak: riakClient, types: ['collection', 'video']});
	t.end();
});

test('set then get then list', t => {
	const video = {
		id: 'riak-tutorial',
		type: 'video',
		title: 'Riak Tutorial'
	};

	const collection = {
		id: 'riak-series',
		type: 'collection',
		title: 'Riak Series'
	};

	bus.sendCommand({role: 'store', cmd: 'set', type: 'collection'}, collection);

	bus.query({role: 'store', cmd: 'set', type: 'video'}, video)
		.then(() => {
			return bus.query({role: 'store', cmd: 'get', type: 'video'}, {id: 'riak-tutorial', type: 'video'});
		})
		.then(result => {
			t.equal(result.id, 'riak-tutorial');
			t.equal(result.type, 'video');
			t.equal(result.title, 'Riak Tutorial');

			return bus.query({role: 'store', cmd: 'get', type: 'video'}, {type: 'video'});
		})
		.then(results => {
			t.equal(results.length, 1);
			t.equal(results[0].id, 'riak-tutorial');
			t.equal(results[0].type, 'video');
			t.equal(results[0].title, 'Riak Tutorial');
			t.end();
		})
		.catch(err => {
			t.end(err);
		});
});

after('close riak server', t => {
	riakClient.shutdown(() => {});
	t.end();
});

'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const test = require('tape');

let server;
const oddworks = require('../../server');

test('CATALOG SERVICE', t => {
	oddworks
		.then(result => {
			server = result;
			t.end();
		});
});

test(`{role: 'catalog', cmd: 'fetch'}, {type: 'video', id: 'daily-show-video-1'}`, t => {
	t.plan(2);

	server.bus
		.query({role: 'catalog', cmd: 'fetch'}, {type: 'video', id: 'daily-show-video-1'})
		.then(video => {
			t.equal(video.id, 'daily-show-video-1', 'has an id');
			t.notOk(video.sharing, 'video does not have sharing text');
			t.end();
		});
});

test(`{role: 'catalog', cmd: 'fetch'}, {type: 'video', id: 'daily-show-video-1', network: 'odd-networks', device: 'apple-ios'}`, t => {
	t.plan(2);

	server.bus
		.query({role: 'catalog', cmd: 'fetch'}, {type: 'video', id: 'daily-show-video-1', network: 'odd-networks', device: 'apple-ios'})
		.then(video => {
			t.equal(video.id, 'daily-show-video-1');
			t.equal(video.sharing.text, 'Watch the @oddnetworks show Live on mobile and TV connected devices!', 'video has sharing text');
			t.end();
		});
});

test(`{role: 'catalog', cmd: 'search'}, {query: 'daily'}`, t => {
	t.plan(1);

	server.bus
		.query({role: 'catalog', cmd: 'search'}, {query: 'daily'})
		.then(results => {
			t.equal(results.length, 4, 'searching "daily" gets 4 results');
			t.end();
		});
});

test(`{role: 'catalog', cmd: 'create'[, searchable: true]}`, t => {
	t.plan(2);

	const dailyShow4 = {
		id: 'daily-show-video-4',
		type: 'video',
		network: 'odd-networks',
		title: 'Daily Show 4'
	};

	const dailyShow5 = {
		id: 'daily-show-video-4',
		type: 'video',
		network: 'odd-networks',
		title: 'Daily Show 5'
	};

	Promise.join(
		server.bus.sendCommand({role: 'catalog', cmd: 'create', searchable: true}, dailyShow4),
		server.bus.sendCommand({role: 'catalog', cmd: 'create'}, dailyShow5)
	)
	.then(() => {
		return server.bus.query({role: 'catalog', cmd: 'search'}, {query: 'daily show'});
	})
	.then(results => {
		t.equal(results.length, 5, 'searching "daily" again after indexing gets 5 results');
		t.notOk(_.find(results, {title: 'Daily Show 5'}), 'non-indexed show is not searchable');
		t.end();
	});
});

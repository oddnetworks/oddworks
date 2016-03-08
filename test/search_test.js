'use strict';

process.env.NODE_ENV = 'test';

var apiAccessToken = require('./fixtures/api_access_token.json').encoded_jwt;

var seneca = require('./seneca-helper');
var test = require('tape');
var request = require('supertest');
var service = require('../odd-device-service').init({seneca: seneca});
var express = service.express();
service.start();

seneca = seneca();

test('A search as JSON', function (t) {
	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['video', 'collection']
			}
		});
	});

	request(express)
	.get('/v1/search?term=poker')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('A search as XML', function (t) {
	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['video', 'videoCollection', 'collection']
			}
		});
	});

	request(express)
	.get('/v1/search?term=poker')
	.set('Accept', 'application/xml')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /xml/)
	.end(function (err, res) {
		t.error(err, res);
		t.end();
	});
});

test('A search with all parameters set', function (t) {
	t.plan(5);

	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 2,
				offset: 3,
				total: 0,
				entityTypes: ['video']
			}
		});
	});

	request(express)
	.get('/v1/search?term=poker&limit=2&offset=3&entityTypes=video')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.equal(res.body.meta.term, 'poker', 'Limit is two');
		t.equal(res.body.meta.limit, 2, 'Limit is two');
		t.equal(JSON.stringify(res.body.meta.entityTypes), JSON.stringify(['video']), 'Entity types set to \'video\'');
		t.equal(res.body.meta.offset, 3, 'Offset is three');
		t.error(err, res);
		t.end();
	});
});

test('A search with entityTypes as an array', function (t) {
	t.plan(2);

	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['video', 'videoCollection']
			}
		});
	});

	request(express)
	.get('/v1/search?term="Poker"&entityTypes[]=video&entityTypes[]=videoCollection&limit=40')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.equal(JSON.stringify(res.body.meta.entityTypes), JSON.stringify(['video', 'videoCollection']), 'Entity types set to \'video\' and \'videoCollection\'');
		t.error(err, res);
		t.end();
	});
});

test('A search with entityTypes as a string', function (t) {
	t.plan(2);

	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['videoCollection']
			}
		});
	});

	request(express)
	.get('/v1/search?term="Poker"&entityTypes=videoCollection&limit=40')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.equal(JSON.stringify(res.body.meta.entityTypes), JSON.stringify(['videoCollection']), 'Entity types set to \'videoCollection\'');
		t.error(err, res);
		t.end();
	});
});

test('A search with entityTypes set to comma-separated string (old style)', function (t) {
	t.plan(2);

	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['video,videoCollection']
			}
		});
	});

	request(express)
	.get('/v1/search?term="Poker"&entityTypes=video,videoCollection&limit=40')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.equal(JSON.stringify(res.body.meta.entityTypes), JSON.stringify(['video,videoCollection']), 'Entity types set to \'video\' and \'videoCollection\'');
		t.error(err, res);
		t.end();
	});
});

test('A search with invalid entityTypes', function (t) {
	t.plan(3);

	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['fakeEntity']
			}
		});
	});

	request(express)
	.get('/v1/search?term="Poker"&entityTypes[]=fakeEntity&limit=40')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.equal(res.status, 200, 'Status is 200');
		t.equal(JSON.stringify(res.body.meta.entityTypes), JSON.stringify(['fakeEntity']), 'Entity types set to \'fakeEntity\'');
		t.error(err, res);
		t.end();
	});
});

test('A search without entityTypes defined', function (t) {
	t.plan(2);

	seneca.add({role: 'catalog', cmd: 'search'}, function (args, done) {
		done(null, {
			data: [],
			meta: {
				term: args.term,
				limit: 10,
				offset: 0,
				total: 0,
				entityTypes: ['video', 'videoCollection']
			}
		});
	});

	request(express)
	.get('/v1/search?term="Poker"&limit=40')
	.set('Accept', 'application/json')
	.set('x-access-token', apiAccessToken)
	.expect(200)
	.expect('Content-Type', /json/)
	.end(function (err, res) {
		t.equal(JSON.stringify(res.body.meta.entityTypes), JSON.stringify(['video', 'videoCollection']), 'Entity types set to \'video\' and \'videoCollection\'');
		t.error(err, res);
		t.end();
	});
});

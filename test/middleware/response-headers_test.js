'use strict';

var test = require('tape');
var responseHeaders = require('../../middleware/response-headers');

var MockExpressRequest = require('mock-express-request');
var MockExpressResponse = require('mock-express-response');

test('Middleware: response-headers', function (t) {
	t.plan(8);

	var req = new MockExpressRequest({
		headers: {
			'Server': 'My Dope Ass Server',
			'Via': 'Dat Interwebz',
			'X-Geo-Country-Code': 'opp'
		}
	});
	var res = new MockExpressResponse();

	responseHeaders(req, res, function () {
		t.equal(res.get('Access-Control-Allow-Origin'), '*');
		t.equal(res.get('Access-Control-Allow-Methods'), 'GET,PUT,POST,DELETE,OPTIONS');
		t.equal(res.get('Access-Control-Allow-Headers'), 'Origin, X-Access-Token, X-Requested-With, Content-Type, Accept, Cache-Control');
		t.equal(res.get('Access-Control-Max-Age'), '600');

		t.equal(res.get('Cache-Control'), 'public, max-age=600, stale-while-revalidate=604800, stale-if-error=604800');

		t.equal(res.get('X-Geo-Country-Code'), 'OPP');

		t.notOk(res.get('Server'));
		t.notOk(res.get('Via'));

		t.end();
	});
});

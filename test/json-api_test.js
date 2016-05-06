'use strict';

const test = require('tape');

const utils = require('../services/json-api/utils');

test('JSON', t => {
	t.skip('Unit test json api service, not server');
	t.end();
});

test('utils.validate()', t => {
	const goodPayload = {
		id: 12345,
		type: 'some-type',
		attributes: {}
	};

	const badPayload = {
		id: 12345,
		attributes: {}
	};

	t.ok(utils.validate(goodPayload), 'goodPayload valid');
	try {
		utils.validate(badPayload);
	} catch (err) {
		t.ok(err, 'badPayload invalid');
	}
	t.end();
});

test('utils.format()', t => {
	const resource = {
		id: 12345,
		type: 'something',
		name: 'Oddworks'
	};

	const formattedResource = utils.format(resource, 'http://localhost');

	t.deepEqual(formattedResource, {
		id: 12345,
		type: 'something',
		attributes: {
			name: 'Oddworks'
		},
		relationships: {},
		links: {
			self: 'http://localhost/somethings/12345'
		},
		meta: {}
	}, 'formatted correctly');
	t.end();
});

test('utils.deformat()', t => {
	const resource = {
		id: 12345,
		type: 'something',
		attributes: {
			name: 'Oddworks'
		},
		relationships: {},
		links: {
			self: 'http://localhost/somethings/12345'
		},
		meta: {}
	};

	const deformattedResource = utils.deformat(resource);

	t.deepEqual(deformattedResource, {
		id: 12345,
		type: 'something',
		name: 'Oddworks',
		relationships: {},
		meta: {}
	}, 'deformatted correctly');
	t.end();
});

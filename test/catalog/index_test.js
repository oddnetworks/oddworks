'use strict';

process.env.JWT_SECRET = 'secret';

const test = require('tape');

test('CATALOG', t => {
	t.skip('Unit test catalog service, not server');
	t.end();
});

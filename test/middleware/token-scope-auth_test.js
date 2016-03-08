var test = require('tape');
var tokenScopeAuth = require('../../middleware/token-scope-auth');

test('Middleware: request-device-org-auth', function (t) {
	t.plan(3);

	var req = {
		accessToken: {
			scope: ['device']
		}
	};

	tokenScopeAuth('device')(req, {}, function (err) {
		t.notOk(err, 'No 401 for correct scope');
	});

	tokenScopeAuth('cbo')(req, {}, function (err) {
		t.equal(err.output.statusCode, 401, 'Throws 401 for wrong scope');
	});

	tokenScopeAuth('device')({}, {}, function (err) {
		t.equal(err.output.statusCode, 401, 'Throws 401 for missing token');
	});

	t.end();
});

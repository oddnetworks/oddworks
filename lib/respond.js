module.exports = {
	ok(res, body) {
		res.status(200);
		res.body = body || {statusCode: 200, message: 'Ok'};
	},

	created(res, body) {
		res.status(201);
		res.body = body || {statusCode: 201, message: 'Created'};
	},

	accepted(res, body) {
		res.status(202);
		res.body = body || {statusCode: 202, message: 'Accepted'};
	}
};

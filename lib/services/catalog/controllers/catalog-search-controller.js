'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class CatalogSearchController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const query = req.query.q;
		const channel = (req.identity.channel || {}).id;
		const type = req.query.type;

		if (!channel) {
			return next(Boom.badRequest('JSON Web Token must include a channel ID for search.'));
		}

		const args = {query, channel, type};

		return this.bus.query({role: 'catalog', cmd: 'search'}, args)
			.then(objects => {
				res.status(200);
				res.body = objects;
				next();
				return null;
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogSearchController spec.bus is required');
		}

		return Controller.create(new CatalogSearchController(spec));
	}
}

module.exports = CatalogSearchController;

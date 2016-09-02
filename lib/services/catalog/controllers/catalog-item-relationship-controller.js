'use strict';

const _ = require('lodash');
const Boom = require('boom');

const controller = require('../../../controllers/controller');

class CatalogItemRelationshipController {
	constructor(spec) {
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const relationshipKey = req.params.relationshipKey;

		const args = {
			channel: req.identity.channel,
			type: this.type,
			id: req.params.id,
			platform: req.identity.platform,
			user: req.identity.user,
			relationshipKey
		};

		// todo - handle includes
		// if (req.query.include) {
		// 	args.include = req.query.include.split(',');
		// }

		// todo - this query may be improved to be relationship aware
		this.bus
			.query({role: 'catalog', cmd: 'fetchItem'}, args)
			.then(resource => {
				if (resource.relationships[relationshipKey]) {
					res.body = resource.relationships[relationshipKey];
					res.status(200);
					next();
				} else {
					// if none return 404
					// http://jsonapi.org/format/#fetching-relationships-responses-404
					res.status(404);
					next(Boom.notFound('No relationships called `${relationshipKey}` found for `${args.type}` `${args.id}`.'));
				}
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogItemRelationshipController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogItemRelationshipController spec.type is required');
		}

		return controller.create(new CatalogItemRelationshipController(spec));
	}
}

module.exports = CatalogItemRelationshipController;

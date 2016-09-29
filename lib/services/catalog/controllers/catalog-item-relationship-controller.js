'use strict';

const _ = require('lodash');
const Boom = require('boom');
const objectSort = require('object-property-natural-sort');

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
			viewer: req.identity.viewer,
			relationshipKey
		};

		if ((req.query || {}).sort) {
			args.include = [relationshipKey];
		}

		// todo - this query may be improved to be relationship aware
		this.bus
			.query({role: 'catalog', cmd: 'fetchItem'}, args)
			.then(resource => {
				if (resource.relationships[relationshipKey]) {
					const relationships = resource.relationships[relationshipKey];

					// sorting
					if (req.query.sort && (resource.included || []).length > 1) {
						let sortBy = req.query.sort;
						const sortDesc = sortBy[0] === '-';
						relationships.data = [];

						// remove all preceding '-'
						if (sortDesc) {
							while (sortBy.charAt(0) === '-') {
								sortBy = sortBy.substr(1);
							}
						}

						// at this time, only allow sorting by one paramater
						sortBy = sortBy.split(',')[0];

						const sorted = resource.included.sort(objectSort(sortBy));
						if (sortDesc) {
							sorted.reverse();
						}

						// construct the data object from sorted
						sorted.map(item => {
							relationships.data.push({id: item.id, type: relationshipKey});
							return item;
						});
					}

					// paging
					if ((req.query || {}).page) {
						let offset = req.query.page.offset ? parseInt(req.query.page.offset, 10) : 0;
						let limit = req.query.page.limit ? parseInt(req.query.page.limit, 10) : 10;

						offset = isNaN(offset) ? 0 : offset;
						limit = isNaN(limit) ? 10 : limit;

						const start = offset * limit;
						let end = start + limit;

						if (end > relationships.length) {
							end = relationships.length;
						}

						// limit relationships
						relationships.data = _.slice(relationships.data, start, end);
					}

					res.body = relationships;
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

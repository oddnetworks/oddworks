'use strict';

const _ = require('lodash');
const Boom = require('boom');
const objectSort = require('object-property-natural-sort');

const utils = require('../../../utils');
const Controller = require('../../../controllers/controller');

class ViewerRelationshipController extends Controller {
	constructor(options) {
		super();
		this.bus = options.bus;
		this.type = 'viewer';
		this.relationship = options.relationship;
	}

	get(req, res, next) {
		if (!this.isAdminRequest(req) && req.params.id !== req.identity.viewer.id) {
			return next(Boom.unauthorized('Viewer specified in JWT does not match requested viewer.'));
		}

		const relationshipKey = this.relationship;

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

					res.body = relationships.data;
					res.status(200);
					next();
				} else {
					// if none return 404
					// http://jsonapi.org/format/#fetching-relationships-responses-404
					res.status(404);
					next(Boom.notFound(`No relationships called ${relationshipKey} found for viewer ${args.id}.`));
				}
			})
			.catch(next);
	}

	post(req, res, next) {
		const args = {
			id: req.params.id,
			type: this.type,
			channel: req.identity.channel.id
		};

		req.body = utils.arrayify(req.body);
		req.body.forEach((resource, index) => {
			if (resource.type !== 'video' && resource.type !== 'collection') {
				return next(Boom.forbidden(`Resource number ${index}, id ${resource.id}, type ${resource.type} is not of type video or collection.`));
			}
		});

		this.bus.query({role: 'store', cmd: 'get', type: this.type}, args)
			.then(viewer => {
				viewer.relationships[this.relationship] = viewer.relationships[this.relationship] || {};
				viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data || [];
				viewer.relationships[this.relationship].data = utils.arrayify(viewer.relationships[this.relationship].data);

				viewer.relationships[this.relationship].data.concat(req.body);
				viewer.relationships[this.relationship].data = _.uniqWith(viewer.relationships[this.relationship].data, _.isEqual);

				if (viewer.relationships[this.relationship].data.length === 1) {
					viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data[0];
				}

				return this.bus.sendCommand({role: 'store', cmd: 'set', type: this.type}, viewer);
			})
			.then(() => {
				res.sendStatus(202);
				return null;
			})
			.catch(next);
	}

	delete(req, res, next) {
		const args = {
			id: req.params.id,
			type: this.type
		};

		req.body = utils.arrayify(req.body);
		req.body.forEach((resource, index) => {
			if (resource.type !== 'video' || resource.type !== 'collection') {
				return next(Boom.forbidden(`Resource number ${index}, id ${resource.id}, type ${resource.type} is not of type video or collection.`));
			}
		});

		this.bus.query({role: 'store', cmd: 'get', type: this.type}, args)
			.then(viewer => {
				viewer.relationships[this.relationship] = viewer.relationships[this.relationship] || {};
				viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data || [];
				viewer.relationships[this.relationship].data = utils.arrayify(viewer.relationships[this.relationship].data);

				// Remove resources from current
				viewer.relationships[this.relationship].data = _.remove(viewer.relationships[this.relationship].data, resource => {
					return _.find(req.body, resource);
				});

				if (viewer.relationships[this.relationship].data.length === 1) {
					viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data[0];
				}

				return this.bus.query({role: 'store', cmd: 'set', type: this.type}, viewer);
			})
			.then(viewer => {
				res.body = viewer.relationships[this.relationship];
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	static create(options) {
		if (!options.bus || !_.isObject(options.bus)) {
			throw new Error('ViewerRelationshipController options.bus is required');
		}
		if (!options.relationship || !_.isString(options.relationship)) {
			throw new Error('ViewerRelationshipController options.relationship is required');
		}

		return Controller.create(new ViewerRelationshipController(options));
	}
}

module.exports = ViewerRelationshipController;

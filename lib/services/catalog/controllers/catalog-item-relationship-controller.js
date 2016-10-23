'use strict';

const _ = require('lodash');
const Boom = require('boom');
const objectSort = require('object-property-natural-sort');

const Controller = require('../../../controllers/controller');

class CatalogItemRelationshipController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const relationshipKey = req.params.relationshipKey;
		const platform = req.identity.platform;
		const viewer = req.identity.viewer;

		let sortBy;
		if ((req.query || {}).sort) {
			// At this time, only allow sorting by one paramater.
			sortBy = req.query.sort.split(',')[0];
		} else {
			sortBy = null;
		}

		let page;
		if ((req.query || {}).page) {
			page = {
				offset: parseInt(req.query.page.offset, 10) || 0,
				limit: parseInt(req.query.page.limit, 10) || 10
			};
		} else {
			page = null;
		}

		return this.getChannel(req)
			.then(channel => {
				const args = {channel, type, id, platform, viewer};
				if (sortBy) {
					args.include = [relationshipKey];
				}

				return this.bus.query({role: 'catalog', cmd: 'fetchItem'}, args);
			})
			.then(resource => {
				if (!resource.relationships || !resource.relationships[relationshipKey]) {
					return Promise.reject(Boom.notFound(
						`No relationships "${relationshipKey}" for "${type}" "${id}".`
					));
				}

				let data = resource.relationships[relationshipKey].data || [];
				let included = resource.included || [];

				// Sorting
				if (sortBy && included.length > 0) {
					// At this time, only allow sorting by one paramater.
					const descending = sortBy.charAt(0) === '-';
					sortBy = sortBy.replace(/^-/, '');

					included = included.sort(objectSort(sortBy));
					if (descending) {
						included = included.reverse();
					}

					data = included.map(item => {
						return {type: item.type, id: item.id};
					});
				}

				// Paging
				if (page && data.length > 0) {
					const start = page.offset * page.limit;
					const end = start + page.limit;
					data = data.slice(start, end);
				}

				res.status(200);
				res.body = data;

				next();
				return null;
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

		return Controller.create(new CatalogItemRelationshipController(spec));
	}
}

module.exports = CatalogItemRelationshipController;

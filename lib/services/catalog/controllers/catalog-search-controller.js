'use strict';

const _ = require('lodash');
const Boom = require('boom');
const objectSort = require('object-property-natural-sort');

const Controller = require('../../../controllers/controller');

class CatalogSearchController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
	}

	get(req, res, next) {
		const query = _.get(req, 'query.q', '');
		const channel = (req.identity.channel || {}).id;

		if (!channel) {
			return next(Boom.badRequest('JSON Web Token must include a channel ID for search.'));
		}

		if (query.length <= 3) {
			return next(Boom.badRequest('`q` query paramater must be at least 3 characters'));
		}

		let types;
		if ((req.query || {}).types) {
			// At this time, only allow sorting by one paramater.
			types = req.query.types.split(',');
		} else {
			types = ['video', 'collection'];
		}

		let sortBy;
		if ((req.query || {}).sort) {
			// At this time, only allow sorting by one paramater.
			sortBy = req.query.sort.split(',')[0];
		} else {
			sortBy = null;
		}

		const page = {
			offset: parseInt(_.get(req, 'query.page.offset'), 10) || 0,
			limit: parseInt(_.get(req, 'query.page.limit'), 10) || 10
		};

		const args = {query, channel, types};

		return this.bus.query({role: 'catalog', cmd: 'search'}, args)
			.then(data => {
				// Sorting
				if (sortBy && data.length > 0) {
					// At this time, only allow sorting by one paramater.
					const descending = sortBy.charAt(0) === '-';
					const osSortBy = sortBy.replace(/^-/, '');

					data = data.sort(objectSort(osSortBy));
					if (descending) {
						data = data.reverse();
					}
				}

				// Paging
				if (page && data.length > 0) {
					const start = page.offset * page.limit;
					const end = start + page.limit;
					data = data.slice(start, end);
				}

				res.status(200);
				res.body = data;

				_.set(res.body, 'meta.query.q', query);
				_.set(res.body, 'meta.query.types', types);
				_.set(res.body, 'meta.page.limit', page.limit);
				_.set(res.body, 'meta.page.offset', page.offset);
				_.set(res.body, 'meta.sort', sortBy);

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

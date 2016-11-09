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

		if ((req.query || {}).types) {
			// At this time, only allow sorting by one paramater.
			req.query.types = req.query.types.split(',');
		} else {
			req.query.types = ['video', 'collection'];
		}

		if ((req.query || {}).sort) {
			// At this time, only allow sorting by one paramater.
			req.query.sort = req.query.sort.split(',')[0];
		} else {
			req.query.sort = null;
		}

		req.query.offset = parseInt(_.get(req, 'query.offset', 0), 10);
		req.query.limit = parseInt(_.get(req, 'query.limit', 10), 10);

		if (req.query.offset < 0) {
			return next(Boom.badRequest('`offset` query parameter must be greater then 0'));
		}

		if (req.query.limit < 1) {
			return next(Boom.badRequest('`limit` query parameter must be greater then 1'));
		}

		const args = {query, channel, types: req.query.types};

		return this.bus.query({role: 'catalog', cmd: 'search'}, args)
			.then(data => {
				// Sorting
				if (req.query.sort && data.length > 0) {
					// At this time, only allow sorting by one paramater.
					const descending = req.query.sort.charAt(0) === '-';
					const sortBy = req.query.sort.replace(/^-/, '');

					data = data.sort(objectSort(sortBy));
					if (descending) {
						data = data.reverse();
					}
				}

				if (data.length > 0) {
					const start = req.query.offset;
					let end = data.length;
					if (req.query.limit) {
						end = start + req.query.limit;
					}
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
			throw new Error('CatalogSearchController spec.bus is required');
		}

		return Controller.create(new CatalogSearchController(spec));
	}
}

module.exports = CatalogSearchController;

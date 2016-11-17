'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
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
		const viewer = req.identity.viewer;

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
				const total = data.length;
				if (total > 0) {
					const start = req.query.offset;
					let end = data.length;
					if (req.query.limit) {
						end = start + req.query.limit;
					}
					data = data.slice(start, end);
				}
				const count = data.length;
				res.meta = Object.assign({}, res.meta, {total, count});

				let resultsPromise = Promise.resolve(data);
				if (data && viewer) {
					resultsPromise = Promise.map(data, resource => {
						const viewerId = (viewer || {}).id;

						// Return the resource and do not apply progress to non-videos
						if (resource.type !== 'video') {
							return resource;
						}

						return this.bus.query({role: 'store', cmd: 'get', type: 'progress'}, {id: `${resource.id}:${viewerId}`, type: 'progress', channel})
							.then(progress => {
								progress = progress || {};
								resource.position = progress.position || 0;
								resource.complete = progress.complete || false;

								return resource;
							});
					});
				}

				return resultsPromise;
			})
			.then(data => {
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

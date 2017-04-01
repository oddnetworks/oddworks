'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class CatalogListController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const platform = req.identity.platform;
		const viewer = req.identity.viewer;
		// default to a result set limit of 10
		// default ot a result set offset of 0
		const pagination = {
			offset: parseInt(_.get(req, 'query.offset', 0), 10),
			limit: parseInt(_.get(req, 'query.limit', 10), 10)
		};
		req.query.offset = pagination.offset;
		req.query.limit = pagination.limit;

		if (!platform && !this.isAdminRequest(req)) {
			return next(Boom.badRequest(
				'A JSON Web Token with a platform is required in a platform request'
			));
		}

		return this.getChannel(req)
			.then(channel => {
				const args = {type, limit: pagination.limit};

				// When no platform ID is present in the JWT during an admin role request,
				// the query for the resource is made directly to the store instead of through
				// the catalog service.
				if (!platform) {
					args.channel = channel.id;
					return this.bus.query({role: 'store', cmd: 'scan', type}, args);
				}

				args.channel = channel;
				args.platform = platform;
				args.viewer = viewer;
				return this.bus.query({role: 'catalog', cmd: 'fetchItemList'}, args);
			})
			.then(data => {
				res.status(200);
				const total = data.length;

				// Pagination
				if (data.length > 0) {
					const start = pagination.offset;
					const end = start + pagination.limit;
					data = data.slice(start, end);
				}

				res.body = data;
				const count = res.body.length;
				res.meta = Object.assign({}, res.meta, {total, count});
				next();
				return null;
			})
			.catch(next);
	}

	post(req, res, next) {
		if (!this.isAdminRequest(req)) {
			return next(Boom.forbidden(`Non admins may not create resources`));
		}

		const type = this.type;
		const payload = _.cloneDeep(req.body || {});
		payload.type = type;

		return this.getChannel(req)
			.then(channel => {
				payload.channel = channel.id;

				// If there is a client defined id, then we check the store for a
				// conflict before moving on.
				if (payload.id) {
					const args = {type, id: payload.id};
					args.channel = channel.id;
					return this.bus.query({role: 'store', cmd: 'get', type}, args);
				}

				return null;
			})
			.then(resource => {
				// Return a 409 error if there was a conflict in the store.
				if (resource) {
					return Promise.reject(Boom.conflict(`The ${type} "${payload.id}" already exists`));
				}
				return this.bus.sendCommand({role: 'catalog', cmd: 'setItem'}, payload);
			})
			.then(resource => {
				res.body = resource;
				res.status(201);
				next();
				return null;
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogListController spec.type is required');
		}

		return Controller.create(new CatalogListController(spec));
	}
}

module.exports = CatalogListController;

'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class IdentityItemController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const args = {type, id};

		return this.getChannel(req)
			.then(channel => {
				args.channel = channel.id;

				if (req.query.include) {
					args.include = req.query.include.split(',');
				}

				return this.bus.query({role: 'store', cmd: 'get', type}, args);
			})
			.then(resource => {
				if (!resource) {
					return Promise.reject(Boom.notFound('resource not found'));
				}

				res.body = resource;
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	patch(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const payload = req.body;
		const args = {type, id};

		return this.getChannel(req)
			.then(channel => {
				args.channel = channel.id;
				return this.bus.query({role: 'store', cmd: 'get', type}, args);
			})
			.then(resource => {
				if (resource) {
					resource = _.merge({}, resource, payload);
					resource.type = type;
					resource.id = id;
					resource.channel = args.channel;

					return this.bus.sendCommand({role: 'store', cmd: 'set', type}, resource);
				}

				return Promise.reject(Boom.notFound(`${type} "${id}" not found`));
			})
			.then(resource => {
				res.body = resource;
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	delete(req, res, next) {
		const type = this.type;
		const id = req.params.id;
		const args = {type, id};

		return this.getChannel(req)
			.then(channel => {
				args.channel = channel.id;
				return this.bus.sendCommand({role: 'store', cmd: 'remove', type}, args);
			})
			.then(() => {
				res.body = {};
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityItemController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('IdentityItemController spec.type is required');
		}

		return Controller.create(new IdentityItemController(spec));
	}
}

module.exports = IdentityItemController;

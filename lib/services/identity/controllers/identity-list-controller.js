'use strict';

const _ = require('lodash');

const Controller = require('../../../controllers/controller');

class IdentityListController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = spec.type;
	}

	get(req, res, next) {
		const type = this.type;
		const limit = parseInt(req.query.limit, 10) || 10;
		const args = {type, limit};
		let promise;

		if (type === 'channel') {
			promise = this.bus.query({role: 'store', cmd: 'scan', type}, args);
		} else {
			promise = this.getChannel(req).then(channel => {
				args.channel = channel.id;
				return this.bus.query({role: 'store', cmd: 'scan', type}, args);
			});
		}

		return promise
			.then(resources => {
				res.status(200);
				res.body = resources;
				next();
				return null;
			})
			.catch(next);
	}

	post(req, res, next) {
		const type = this.type;
		const payload = _.cloneDeep(req.body);
		payload.type = type;
		let promise;

		if (type === 'channel') {
			promise = this.bus.sendCommand({role: 'store', cmd: 'set', type}, payload);
		} else {
			promise = this.getChannel(req).then(channel => {
				payload.channel = channel.id;
				return this.bus.sendCommand({role: 'store', cmd: 'set', type}, payload);
			});
		}

		return promise
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
			throw new Error('IdentityListController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('IdentityListController spec.type is required');
		}

		return Controller.create(new IdentityListController(spec));
	}
}

module.exports = IdentityListController;

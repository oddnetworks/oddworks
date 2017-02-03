'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');
const utils = require('../../../utils');
const IdentityItemController = require('./identity-item-controller');

class IdentityChannelController extends IdentityItemController {
	get(req, res, next) {
		const type = 'channel';
		const id = req.params.id;
		const args = {type, id};

		const err = this.checkChannelAccess(req);
		if (err) {
			return next(err);
		}

		if (req.query.include) {
			args.include = req.query.include.split(',');
		}

		return this.bus.query({role: 'store', cmd: 'get', type}, args)
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
		const type = 'channel';
		const id = req.params.id;
		const payload = req.body;
		const args = {type, id};

		const err = this.checkChannelAccess(req);
		if (err) {
			return next(err);
		}

		return this.bus.query({role: 'store', cmd: 'get', type}, args)
			.then(resource => {
				if (resource) {
					resource = utils.updateObject(resource, payload);
					resource.type = type;
					resource.id = id;

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
		const type = 'channel';
		const id = req.params.id;
		const args = {type, id};

		const err = this.checkChannelAccess(req);
		if (err) {
			return next(err);
		}

		return this.bus.sendCommand({role: 'store', cmd: 'remove', type}, args)
			.then(() => {
				res.body = {};
				res.status(200);
				next();
				return null;
			})
			.catch(next);
	}

	checkChannelAccess(req) {
		if (this.isAdminRequest(req)) {
			return null;
		}

		const channelId = _.get(req, 'identity.channel.id');
		if (!channelId) {
			return Boom.forbidden('Non admin callers must have a channel embedded in the JSON Web Token');
		}

		if (req.params.id !== channelId) {
			return Boom.forbidden('Access to the requested channel is forbidden');
		}

		return null;
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityChannelController spec.bus is required');
		}

		return Controller.create(new IdentityChannelController({
			bus: spec.bus,
			type: 'channel'
		}));
	}
}

module.exports = IdentityChannelController;

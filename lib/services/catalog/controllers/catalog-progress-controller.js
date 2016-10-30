'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');

class CatalogProgressController extends Controller {
	constructor(spec) {
		super();
		this.bus = spec.bus;
		this.type = 'progress';
	}

	post(req, res, next) {
		const videoId = req.params.id;
		const viewerId = (req.identity.viewer || {}).id;
		const payload = req.body;

		// Validate Progress requirements
		if (!viewerId) {
			return next(Boom.forbidden('req.identity.viewer does not exist'));
		}
		if (!payload.position && !payload.complete) {
			return next(Boom.badData('position (Number) or complete (Boolean) must be present'));
		}
		if (payload.position && !_.isNumber(payload.position) && payload.position >= 0) {
			return next(Boom.badData('position (Number) must be a positive number'));
		}
		if (payload.complete && !_.isBoolean(payload.complete)) {
			return next(Boom.badData('complete (Boolean) must be true or false'));
		}

		const args = {
			id: `${viewerId}:${videoId}`,
			type: this.type
		};

		return this.getChannel(req)
			.then(channel => {
				args.channel = channel.id;

				return this.bus.query({role: 'store', cmd: 'get', type: this.type}, args);
			})
			.then(progress => {
				// If no previous progress was found then set properties to create a new one
				if (!progress) {
					progress = {
						id: args.id,
						type: this.type,
						channel: args.channel
					};
				}

				// If existing or new set the position and complete from POST payload
				progress.position = payload.position || 0;
				progress.complete = payload.complete || false;

				return this.bus.sendCommand({role: 'store', cmd: 'set', type: this.type}, progress);
			})
			.then(progress => {
				res.body = progress;
				res.status(201);
				next();
				return null;
			})
			.catch(next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogProgressController spec.bus is required');
		}

		return Controller.create(new CatalogProgressController(spec));
	}
}

module.exports = CatalogProgressController;

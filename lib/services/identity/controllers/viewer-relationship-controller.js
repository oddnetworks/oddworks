'use strict';

const _ = require('lodash');
const Boom = require('boom');

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

		if (req.identity.viewer) {
			res.body = _.get(req, `identity.viewer.relationships.${relationshipKey}.data`, null);
			res.status(200);
			next();
		} else {
			this.bus.query({role: 'store', cmd: 'get', type: this.type}, {id: req.params.id, type: this.type, channel: req.identity.channel.id})
				.then(viewer => {
					if (!viewer) {
						return next(Boom.notFound(`viewer ${req.params.id} not found`));
					}

					res.body = _.get(viewer, `relationships.${relationshipKey}.data`, null);
					res.status(200);
					next();
				})
				.catch(next);
		}
	}

	post(req, res, next) {
		if (!this.isAdminRequest(req) && req.params.id !== req.identity.viewer.id) {
			return next(Boom.unauthorized('Viewer specified in JWT does not match requested viewer.'));
		}

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

		return this.bus.query({role: 'store', cmd: 'get', type: this.type}, args)
			.then(viewer => {
				viewer.relationships[this.relationship] = viewer.relationships[this.relationship] || {};
				viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data || [];
				viewer.relationships[this.relationship].data = utils.arrayify(viewer.relationships[this.relationship].data);

				viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data.concat(req.body);
				viewer.relationships[this.relationship].data = _.uniqWith(viewer.relationships[this.relationship].data, _.isEqual);

				if (viewer.relationships[this.relationship].data.length === 1) {
					viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data[0];
				}

				return this.bus.sendCommand({role: 'store', cmd: 'set', type: this.type}, viewer);
			})
			.then(viewer => {
				res.sendStatus(202);
				return viewer;
			})
			.catch(next);
	}

	delete(req, res, next) {
		if (!this.isAdminRequest(req) && req.params.id !== req.identity.viewer.id) {
			return next(Boom.unauthorized('Viewer specified in JWT does not match requested viewer.'));
		}

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

		return this.bus.query({role: 'store', cmd: 'get', type: this.type}, args)
			.then(viewer => {
				viewer.relationships[this.relationship] = viewer.relationships[this.relationship] || {};
				viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data || [];
				viewer.relationships[this.relationship].data = utils.arrayify(viewer.relationships[this.relationship].data);

				// Remove resources from current
				_.remove(viewer.relationships[this.relationship].data, resource => {
					return _.find(req.body, resource);
				});

				if (viewer.relationships[this.relationship].data.length === 1) {
					viewer.relationships[this.relationship].data = viewer.relationships[this.relationship].data[0];
				}

				return this.bus.sendCommand({role: 'store', cmd: 'set', type: this.type}, viewer);
			})
			.then(viewer => {
				res.sendStatus(202);
				return viewer;
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

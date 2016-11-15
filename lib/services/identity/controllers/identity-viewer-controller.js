'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');
const IdentityItemController = require('./identity-item-controller');

class IdentityViewerController extends IdentityItemController {
	get(req, res, next) {
		const err = this.checkViewerAccess(req);
		if (err) {
			return next(err);
		}

		return super.get(req, res, next);
	}

	patch(req, res, next) {
		const err = this.checkViewerAccess(req);
		if (err) {
			return next(err);
		}

		return super.patch(req, res, next);
	}

	delete(req, res, next) {
		const err = this.checkViewerAccess(req);
		if (err) {
			return next(err);
		}

		return super.delete(req, res, next);
	}

	checkViewerAccess(req) {
		if (this.isAdminRequest(req)) {
			return null;
		}

		const viewerId = _.get(req, 'identity.viewer.id');
		if (req.params.id !== viewerId) {
			return Boom.forbidden('Viewer specified in JWT does not match requested viewer.');
		}

		return null;
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('IdentityViewerController spec.bus is required');
		}

		return Controller.create(new IdentityViewerController({
			bus: spec.bus,
			type: 'viewer'
		}));
	}
}

module.exports = IdentityViewerController;

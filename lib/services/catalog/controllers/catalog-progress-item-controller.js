'use strict';

const _ = require('lodash');
const Boom = require('boom');

const Controller = require('../../../controllers/controller');
const CatalogItemController = require('./catalog-item-controller');

class CatalogProgressItemController extends CatalogItemController {
	patch(req, res, next) {
		const viewerId = (req.identity.viewer || {}).id;

		// Validate Progress requirements
		if (!viewerId) {
			return next(Boom.forbidden('req.identity.viewer does not exist'));
		}

		if (!req.body.video) {
			return next(Boom.badRequest('video (String) is required'));
		}
		if (!req.body.position && !req.body.complete) {
			return next(Boom.badRequest('position (Number) or complete (Boolean) must be present'));
		}
		if (req.body.position && !_.isNumber(req.body.position) && req.body.position >= 0) {
			return next(Boom.badRequest('position (Number) must be a positive number'));
		}
		if (req.body.complete && !_.isBoolean(req.body.position) && req.body.position >= 0) {
			return next(Boom.badRequest('complete (Boolean) must be true or false'));
		}

		// Remove protected attributes
		delete req.body.id;
		delete req.body.video;
		delete req.body.viewer;

		// Call the super controller for a normal post of a catalog item
		super.patch(req, res, next);
	}

	static create(spec) {
		if (!spec.bus || !_.isObject(spec.bus)) {
			throw new Error('CatalogProgressItemController spec.bus is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('CatalogProgressItemController spec.type is required');
		}

		return Controller.create(new CatalogProgressItemController(spec));
	}
}

module.exports = CatalogProgressItemController;

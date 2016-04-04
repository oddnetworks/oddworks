'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var inflection = require('inflection');
var boom = require('boom');
var queryString = require('query-string');

function getEntity(req, res, next, done) {
	var entityType = req.params.entityType;
	var entityId = req.params.entityId;
	var depth = req.query.include ? 2 : 0;
	var seneca = req.app.get('seneca');
	var act = Promise.promisify(seneca.act, seneca);

	var cmd = 'fetch_' + inflection.underscore(entityType);
	cmd = inflection.camelize(cmd, true);
	cmd = inflection.singularize(cmd);

	act({role: 'catalog', cmd: cmd, id: entityId, network: req.identity.network, device: req.identity.device, user: req.identity.user})
		.then(function setReqData(entity) {
			if (!entity) {
				return next(boom.notFound());
			}

			req.data = entity;

			if (!depth) {
				return done(null, req, res, next);
			}

			if (entity.type === 'video') {
				done(null, req, res, next);
			} else {
				return Promise.resolve(entity)
					.then(function fetchRelatedEntities(entity) {
						return act({role: 'catalog', cmd: 'related', depth: depth, entity: entity, network: req.identity.network, device: req.identity.device, user: req.identity.user});
					})
					.then(function setReqIncluded(relatedEntities) {
						req.included = relatedEntities;
						return done(null, req, res, next);
					});
			}
		})
		.catch(function wrapErrorWithBoom(error) {
			next(boom.wrap(error));
		});
}

function getEntityRelationship(req, res, next, done) {
	var relationship = req.params.relationship;
	var entityType = req.params.entityType;
	var entityId = req.params.entityId;
	// HACK this is always 2, we can't specify depth @BJC @EJS
	var depth = req.query.include ? 2 : 0;
	var seneca = req.app.get('seneca');
	var act = Promise.promisify(seneca.act, seneca);

	var cmd = 'fetch_' + inflection.underscore(entityType);
	cmd = inflection.camelize(cmd, true);
	cmd = inflection.singularize(cmd);
	var relatedEntities;
	var isSingleEntity;

	// First, fetch the base entity
	act({role: 'catalog', cmd: cmd, id: entityId, depth: depth, network: req.identity.network, device: req.identity.device, user: req.identity.user})
		.then(function fetchRelatedEntities(entity) {
			if (!entity) {
				return next(boom.notFound('Entity not found'));
			} else if (!entity.relationships || !entity.relationships[relationship]) {
				return next(boom.notFound('Relationship not found'));
			}

			relatedEntities = entity.relationships[relationship].data;
			isSingleEntity = !_.isArray(relatedEntities);

			if (isSingleEntity) {
				var relatedEntityCmd = 'fetch_' + inflection.underscore(relatedEntities.type);
				relatedEntityCmd = inflection.camelize(relatedEntityCmd, true);
				relatedEntityCmd = inflection.singularize(relatedEntityCmd);
				return act({role: 'catalog', cmd: relatedEntityCmd, id: relatedEntities.id, depth: depth});
			}

			return Promise.all(_.map(relatedEntities, function fetchMultipleRelatedEntities(relatedEntity) {
				var relatedEntityCmd = 'fetch_' + inflection.underscore(relatedEntity.type);
				relatedEntityCmd = inflection.camelize(relatedEntityCmd, true);
				relatedEntityCmd = inflection.singularize(relatedEntityCmd);

				return act({role: 'catalog', cmd: relatedEntityCmd, id: relatedEntity.id, depth: depth,
					network: req.identity.network, device: req.identity.device});
			}));
		})
		.then(function setReqData(relatedResults) {
			if ((isSingleEntity && !relatedResults) ||
				(!isSingleEntity && _.compact(relatedResults).length < relatedEntities.length)) {
				next(boom.notFound('Related entity not found'));
			}

			req.data = relatedResults;

			return Promise.resolve(relatedResults);
		})
		.then(function fetchDeepRelatedEntities(relatedResults) {
			if (isSingleEntity) {
				return act({role: 'catalog', cmd: 'related', depth: depth, entity: relatedResults,
					network: req.identity.network, device: req.identity.device, user: req.identity.user});
			}

			return Promise.all(_.map(relatedResults, function fetchDeepRelatedEntity(result) {
				return act({role: 'catalog', cmd: 'related', depth: depth, entity: result,
					network: req.identity.network, device: req.identity.device, user: req.identity.user});
			}));
		})
		.then(function flattenDeepRelatedEntities(deepRelatedEntities) {
			return _(deepRelatedEntities).flatten().compact().value();
		})
		.then(function setReqIncluded(deepRelatedEntities) {
			req.included = deepRelatedEntities;
			return done(null, req, res, next);
		})
		.catch(function wrapErrorWithBoom(error) {
			return next(boom.wrap(error));
		});
}

function getAllEntities(req, res, next, done) {
	var entityType = req.params.entityType;
	var seneca = req.app.get('seneca');
	var act = Promise.promisify(seneca.act, seneca);

	var cmd = 'fetch_' + inflection.underscore(entityType);
	cmd = inflection.camelize(cmd, true);
	cmd = inflection.pluralize(cmd);

	var pattern = {
		role: 'catalog',
		cmd: cmd,
		network: req.identity.network,
		device: req.identity.device,
		user: req.identity.user
	};

	if (req.query.filter) {
		pattern = _.assign({
			filter: queryString.parse(req.query.filter)
		}, pattern);
	}

	act(pattern)
		.then(function setReqData(entities) {
			if (!entities) {
				req.data = [];
				return done(null, req, res, next);
			}

			req.data = entities;

			return done(null, req, res, next);
		})
		.catch(function wrapErrorWithBoom(error) {
			return next(boom.wrap(error));
		});
}

function searchEntities(req, res, next, done) {
	if (_.isUndefined(req.query.term)) {
		next(boom.badRequest('Term is required'));
	} else {
		var seneca = req.app.get('seneca');

		var limit = 10;
		if (req.query.limit) {
			req.query.limit = parseInt(req.query.limit, 10);
			if (req.query.limit >= 0) {
				limit = req.query.limit;
			}
		}

		var offset = 0;
		if (req.query.offset) {
			req.query.offset = parseInt(req.query.offset, 0);
			if (req.query.offset >= 0) {
				offset = req.query.offset;
			}
		}

		var entityTypes = _.flatten([req.query.entityTypes]);
		entityTypes = _.without(entityTypes, null, undefined);
		if (entityTypes.length === 0) {
			entityTypes = null;
		}

		seneca.act({
			role: 'catalog', cmd: 'search',
			term: req.query.term,
			limit: limit,
			offset: offset,
			entityTypes: entityTypes,
			network: req.identity.network,
			device: req.identity.device,
			user: req.identity.user
		}, function (err, entities) {
			if (err) {
				return next(boom.wrap(err));
			}
			if (!entities) {
				return next(boom.notFound());
			}

			req.data = entities;

			done(null, req, res, next);
		});
	}
}

module.exports = {
	getEntity: getEntity,
	getAllEntities: getAllEntities,
	getEntityRelationship: getEntityRelationship,
	searchEntities: searchEntities
};

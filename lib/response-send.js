var _ = require('lodash');
var decorate = require('./response-decorators');
var formatter = require('./response-formatter');
var boom = require('boom');

// Cleans an individual Entity
function scrubEntity(entity) {
	entity = JSON.parse(JSON.stringify(entity));

	if (_.isFunction(entity.data$)) {
		entity = entity.data$();
	}

	/*eslint-disable */
	if (entity['entity$']) {
		delete entity['entity$'];
	}
	/*eslint-enable */

	return entity;
}

function send(err, req, res, next) {
	if (err) {
		return next(boom.wrap(err));
	}

	if (req.created) {
		res.status(201);
		return formatter(res);
	}

	if (!req.data) {
		return next(boom.notFound());
	}

	res.body = {};

	// Scrub-a-dub-dub
	if (_.isArray(req.data)) {
		// A collection of entities
		res.body.data = _(req.data).compact().map(scrubEntity).value();
	} else if (req.data && req.data.data && req.data.meta) {
		// Came from /search with data and meta set
		res.body.data = _(req.data.data).compact().map(scrubEntity).value();
		res.body.meta = req.data.meta;
	} else {
		// A single entity
		res.body.data = scrubEntity(req.data);
	}

	if (_.isArray(req.included)) {
		res.body.included = _.map(req.included, scrubEntity);
	}

	res = decorate.interpolateAdUrls(req, res);

	res = decorate.withMeta(req, res);
	res = decorate.withLinks(req, res);
	res = decorate.withLocale(req, res);
	res = decorate.withAttributes(req, res);

	// MUST BE LAST!!!
	res = decorate.withDeviceFilter(req, res);

	formatter(res);
}

module.exports = send;

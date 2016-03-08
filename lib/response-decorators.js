'use strict';

var _ = require('lodash');
var inflection = require('inflection');
var dataFilters = require('../lib/data-filters');
var utils = require('../lib/utils');
var interpolate = require('interpolate');

function applyEntitySelfLinks(req, entity, version) {
	// skip non-catalog things. @TQ
	if (!entity.type) {
		return entity;
	}

	entity.links = {
		self: utils.link(req, [version, inflection.pluralize(entity.type), entity.id].join('/'))
	};

	return entity;
}

function applyEntityRelationshipsLinks(req, entity) {
	_.each(entity.relationships, function addRelLink(relationship) {
		if (relationship.links && relationship.links.self && !relationship.links.self.match(/https?\:\/\//)) {
			relationship.links.self = utils.link(req, relationship.links.self);
		}
	});
}

function applyIncludedLinks(req, included, version) {
	_.each(included, function addIncludedLink(entity) {
		applyEntitySelfLinks(req, entity, version);
		applyEntityRelationshipsLinks(req, entity);
		return entity;
	});
}

function applyEntityLocale(entity, locale) {
	// skip non-catalog things. @TQ
	if (!entity.locales) {
		return entity;
	}

	var enUSLocale = _.find(entity.locales, function (item) {
		return item.locale === 'en-us';
	});

	var targetLocale = _.find(entity.locales, function (item) {
		return item.locale === locale;
	});

	if (locale && targetLocale && locale !== 'en-us') {
		if (enUSLocale) {
			entity.attributes.locales = _.merge(enUSLocale, targetLocale);
		} else {
			entity.attributes.locales = targetLocale;
		}
	} else if (enUSLocale) {
		entity.attributes.locales = enUSLocale;
	}

	return entity;
}

function applyIncludedLocales(included, locale) {
	_.each(included, function (entity) {
		applyEntityLocale(entity, locale);
	});
}

function applyEntityDeviceFilter(entity, device) {
	var dataFilter = dataFilters[device];
	if (!dataFilter) {
		return entity;
	}

	var entityFilter = dataFilter[entity.type];
	if (!entityFilter) {
		return entity;
	}

	// HACK: We're passing ID now too because its needed for the reacharound hack. @BJC
	//			 Eventually we just pass the whole entity @EJS
	entity.attributes = entityFilter(_.clone(entity.attributes), entity.id);

	return entity;
}

function applyIncludedDeviceFilter(included, device) {
	included = _.map(included, function (entity) {
		return applyEntityDeviceFilter(entity, device);
	});

	return included;
}

function applyEntityAttributes(entity) {
	var jsonAPIKeys = ['id', 'type', 'relationships', 'meta', 'links'];
	var attributes = _.omit(entity, jsonAPIKeys);

	_.forOwn(attributes, function (value, key) {
		delete entity[key];
	});

	entity.attributes = _.cloneDeep(attributes);

	return entity;
}

function applyIncludedAttributes(included) {
	included = _.map(included, function (entity) {
		return applyEntityAttributes(entity);
	});

	return included;
}

function decorateDataWithLinks(req, res) {
	var data = res.body.data;
	var version = req.params.version;

	if (_.isArray(data)) {
		_.each(data, function (entity) {
			applyEntityRelationshipsLinks(req, entity);
			applyEntitySelfLinks(req, entity, version);
		});
	} else {
		// Entity
		applyEntityRelationshipsLinks(req, data);
		applyEntitySelfLinks(req, data, version);
	}

	return data;
}

function decorateIncludedWithLinks(req, res) {
	var version = req.params.version;
	var included = res.body.included;

	applyIncludedLinks(req, included, version);

	return included;
}

function decorateDataWithLocale(req, res) {
	var data = res.body.data;
	var locale = req.query.locale;

	if (_.isArray(data)) {
		_.each(data, function (entity) {
			applyEntityLocale(entity, locale);
		});
	} else {
		// Entity
		applyEntityLocale(data, locale);
	}

	return data;
}

function decorateIncludedWithLocale(req, res) {
	var locale = req.query.locale;
	var included = res.body.included;

	applyIncludedLocales(included, locale);

	return included;
}

function decorateDataWithDeviceFilter(req, res) {
	var data = res.body.data;
	var device = req.identity.device.deviceType;

	if (_.isArray(data)) {
		_.each(data, function (entity) {
			applyEntityDeviceFilter(entity, device);
		});
	} else {
		// Entity
		applyEntityDeviceFilter(data, device);
	}

	return data;
}

function decorateIncludedWithDeviceFilter(req, res) {
	var device = req.identity.device.deviceType;
	var included = res.body.included;

	applyIncludedDeviceFilter(included, device);

	return included;
}

function decorateDataWithAttributes(req, res) {
	var data = res.body.data;

	if (_.isArray(data)) {
		_.each(data, function (entity) {
			applyEntityAttributes(entity);
		});
	} else {
		// Entity
		applyEntityAttributes(data);
	}

	return data;
}

function decorateIncludedWithAttributes(req, res) {
	var included = res.body.included;

	applyIncludedAttributes(included);

	return included;
}

function interpolateAdUrl(entity, req) {
	if (_.has(entity, 'ads.url')) {
		var adUrl = _.get(entity, 'ads.url');
		var interpolatedValue = interpolate(adUrl, req);
		_.set(entity, 'ads.url', interpolatedValue);
	}
}

module.exports = {
	withLinks: function (req, res) {
		// Request Link
		res.body.links = {
			self: utils.link(req)
		};

		// Entity Link
		if (res.body.data) {
			res.body.data = decorateDataWithLinks(req, res);
		}

		// Included Entity Links
		if (res.body.included) {
			res.body.included = decorateIncludedWithLinks(req, res);
		}

		return res;
	},
	withMeta: function (req, res) {
		res.body.meta = _.assign({
			device: req.identity.device.deviceType,
			queryParams: req.query
		}, res.body.meta);

		return res;
	},
	withLocale: function (req, res) {
		// Entity Link
		if (res.body.data) {
			res.body.data = decorateDataWithLocale(req, res);
		}

		// Included Entity Links
		if (res.body.included) {
			res.body.included = decorateIncludedWithLocale(req, res);
		}

		return res;
	},
	withDeviceFilter: function (req, res) {
		// Entity Link
		if (res.body.data) {
			res.body.data = decorateDataWithDeviceFilter(req, res);
		}

		// Included Entity Links
		if (res.body.included) {
			res.body.included = decorateIncludedWithDeviceFilter(req, res);
		}

		return res;
	},
	withAttributes: function (req, res) {
		// Entity Link
		if (res.body.data) {
			res.body.data = decorateDataWithAttributes(req, res);
		}

		// Included Entity Links
		if (res.body.included) {
			res.body.included = decorateIncludedWithAttributes(req, res);
		}

		return res;
	},

	interpolateAdUrls: function (req, res) {
		if (_.isArray(res.body.data)) {
			_.each(res.body.data, function (entity) {
				interpolateAdUrl(entity, req);
			});
		} else {
			interpolateAdUrl(res.body.data, req);
		}

		if (res.body.included) {
			_.each(res.body.included, function (entity) {
				interpolateAdUrl(entity, req);
			});
		}

		return res;
	}
};

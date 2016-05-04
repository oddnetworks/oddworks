'use strict';

const _ = require('lodash');
const traverse = require('traverse');

_.templateSettings = {
	evaluate: /{{([\s\S]+?)}}/g,
	interpolate: /{{=([\s\S]+?)}}/g,
	escape: /{{-([\s\S]+?)}}/g
};

const videoKeys = ['ads', 'player', 'sharing', 'overlay'];

function composeMetaFeatures(object, features) {
	let metaFeatures = _.get(object, 'meta.features');

	metaFeatures = _.merge({}, metaFeatures, _.pick(features, videoKeys));

	traverse(metaFeatures).forEach(function (value) {
		if (_.isString(value)) {
			const interpolate = _.template(value);
			this.update(interpolate(object));
		}
	});

	return metaFeatures;
}

module.exports = {composeMetaFeatures};

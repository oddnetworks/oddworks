'use strict';

var catalog = require('../lib/catalog');
var send = require('../lib/response-send');

module.exports = {
	index: function index(req, res, next) {
		catalog.getAllEntities(req, res, next, send);
	},

	get: function get(req, res, next) {
		catalog.getEntity(req, res, next, send);
	},

	related: function related(req, res, next) {
		catalog.getEntityRelationship(req, res, next, send);
	},

	search: function search(req, res, next) {
		catalog.searchEntities(req, res, next, send);
	}
};

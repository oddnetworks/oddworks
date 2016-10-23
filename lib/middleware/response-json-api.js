'use strict';

const url = require('url');
const querystring = require('querystring');
const _ = require('lodash');
const Boom = require('boom');

const JSON_API_KEYS = ['id', 'type', 'relationships', 'meta', 'links'];

// options.bus - Object *required*
// options.baseUrlPrefix - String ex: "/v2".
// options.excludePortFromLinks - Boolean (default == false) If true, don't
//   include the port number in links.
module.exports = function (options) {
	options = options || {};

	const BASE_PREFIX = options.baseUrlPrefix;
	const EXCLUDE_PORT_FROM_LINKS = Boolean(options.excludePortFromLinks);

	const bus = options.bus;

	if (!bus || !_.isObject(bus)) {
		throw new Error('options.bus is required.');
	}

	function format(data, baseUrl) {
		const resource = {};

		if (data.id && data.type) {
			resource.id = data.id;
			resource.type = data.type;

			resource.attributes = _.omit(data, JSON_API_KEYS);

			resource.relationships = data.relationships ? _.cloneDeep(data.relationships) : {};

			if (resource.type === 'config') {
				resource.links = {
					self: `${baseUrl}/config`
				};
			} else {
				resource.links = {
					self: `${baseUrl}/${resource.type}s/${resource.id}`
				};
			}

			resource.meta = data.meta ? _.cloneDeep(data.meta) : {};
		}

		return resource;
	}

	function composeIncluded(include, data, baseUrl) {
		include = include.split(',');
		const included = _.compact(data.included || []);
		const relationships = data.relationships || {};

		function inIncluded(item, key) {
			const foundIndex = _.findIndex(included, {type: item.type, id: item.id});
			if (foundIndex < 0) {
				bus.broadcast({level: 'warn', event: 'json-api-missing-relationship'}, {
					message: `id:${data.id}, key:${key}, fk:${item.id}`
				});
				return false;
			}
			return included[foundIndex];
		}

		const finalIncluded = Object.keys(relationships).reduce((finalIncluded, key) => {
			// If the request did not ?include= this relationship, don't include it.
			if (include.indexOf(key) < 0) {
				return finalIncluded;
			}

			const rel = relationships[key].data || {};

			// Only include relationships actually referenced.
			// Remove relationship references that were not found.
			if (Array.isArray(rel)) {
				rel.slice().forEach(item => {
					const res = inIncluded(item, key);
					if (res) {
						finalIncluded.push(res);
					} else {
						const i = rel.indexOf(item);
						if (i >= 0) {
							rel.splice(i, 1);
						}
					}
				});
			} else {
				const res = inIncluded(rel, key);
				if (res) {
					finalIncluded.push(res);
				} else {
					delete relationships[key];
				}
			}

			return finalIncluded;
		}, []);

		if (finalIncluded.length > 0) {
			return finalIncluded.map(entity => {
				return format(entity, baseUrl);
			});
		}

		return [];
	}

	const repsonseJsonApi = (req, res, next) => {
		if (!res.body) {
			return next(Boom.notFound());
		}

		let baseUrl = `${req.protocol}://${req.hostname}`;
		const port = req.socket.address().port || process.env.PORT;

		let defaultPort = false;
		if ((req.protocol === 'http' && port === 80) ||
			(req.protocol === 'https' && port === 443)) {
			defaultPort = true;
		}

		if (!defaultPort && !EXCLUDE_PORT_FROM_LINKS) {
			baseUrl = `${baseUrl}:${port}`;
		}

		if (BASE_PREFIX) {
			baseUrl = `${baseUrl}${BASE_PREFIX}`;
		}

		let data;

		if (_.isArray(res.body)) {
			const regex = /\/relationships\//;
			if (regex.test(req.url.toLowerCase())) {
				const data = _.cloneDeep(res.body);
				res.body = {
					data
				};
				res.body.links = {
					self: `${baseUrl}${req.url}`
				};
				next();
			} else {
				let baseSelfLink;
				const linksQueries = res.body.linksQueries;
				if (res.body.length === 0) {
					res.body = {
						data: []
					};
					baseSelfLink = `${baseUrl}${url.parse(req.url).pathname}`;
				} else {
					data = res.body.slice();
					res.body = {};

					res.body.data = data.map(object => {
						delete object.included;
						return format(object, baseUrl);
					});

					baseSelfLink = `${baseUrl}/${data[0].type}s`;
				}

				const query = url.parse(req.url).query;
				const selfLink = query ? `${baseSelfLink}?${query}` : baseSelfLink;

				res.body.links = {
					self: selfLink
				};

				if (linksQueries) {
					Object.keys(linksQueries).forEach(key => {
						const qs = querystring.stringify(linksQueries[key]);
						res.body.links[key] = `${baseSelfLink}?${qs}`;
					});
				}
			}
		} else {
			data = _.cloneDeep(res.body);
			res.body = {};

			if (_.isString(req.query.include)) {
				// make a single object with all of the relationships of the requested entities
				const toInclude = req.query.include.split(',');
				let allRelationships = [];
				toInclude.map(type => {
					allRelationships = allRelationships.concat((data.relationships[type] || {}).data);
					return type;
				});

				const allowPartialIncluded = Boolean(options.allowPartialIncluded);
				const allRelationshipsPresent = (data.included || []).length === (allRelationships || []).length;

				if (allowPartialIncluded || allRelationshipsPresent) {
					res.body.included = composeIncluded(req.query.include, data, baseUrl);
				} else {
					// send back an errors array
					res.body = {
						errors: [
							{
								code: '500',
								source: {pointer: req.url},
								title: 'Internal Server Error',
								detail: 'Root resource references missing relationship(s)'
							}
						]
					};
					allRelationships.map(item => {
						// if this item is not in successfully retrieved data.included
						if (!_.some(data.included, {id: item.id})) {
							const missingItem = {
								code: '410',
								title: 'Gone',
								detail: `No ${item.type || 'resource'} with id ${item.id || ''}`,
								meta: {
									identifier: {
										id: item.id,
										type: item.type
									}
								}
							};
							// include in the error message
							res.body.errors.push(missingItem);
							return missingItem;
						}
						return null;
					});

					// stop adding things to the response
					return next();
				}
			}

			delete data.included;

			res.body.data = format(data, baseUrl);
			res.body.links = res.body.data.links;
		}

		res.body.meta = {};

		if (req.identity) {
			if (req.identity.channel) {
				res.body.meta.channel = req.identity.channel.id;
			}
			if (req.identity.platform) {
				res.body.meta.platform = req.identity.platform.platformType;
			}
		}

		next();
	};

	return repsonseJsonApi;
};

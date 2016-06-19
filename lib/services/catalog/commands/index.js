'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const Boom = require('boom');
const uuid = require('node-uuid');

module.exports = function (service) {
	const commands = Object.create(null);

	commands.setItem = function setItem(payload) {
		if (!payload.channel || !_.isString(payload.channel)) {
			throw new Error('payload.channel is required');
		}
		if (!payload.type || !_.isString(payload.type)) {
			throw new Error('payload.type is required');
		}

		return service.bus.sendCommand(
			{role: 'store', cmd: 'set', type: payload.type},
			payload
		);
	};

	commands.removeItem = function removeItem(args) {
		args = args || {};

		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}
		if (!args.id || !_.isString(args.id)) {
			throw new Error('args.id is required');
		}

		const type = args.type;

		const spec = {
			channel: args.channel,
			type: `${type}Spec`,
			id: args.id.replace(/res$/, 'spec')
		};

		// Remove the spec for this object if it exists.
		service.bus.sendCommand({role: 'catalog', cmd: 'removeSpec'}, spec);

		return service.bus
			.sendCommand({role: 'store', cmd: 'remove', type}, args)
			.then(_.constant(true));
	};

	commands.setItemSpec = function setItemSpec(spec) {
		spec = spec || {};

		if (!spec.channel || !_.isObject(spec.channel)) {
			throw new Error('spec.channel is required');
		}
		if (!spec.type || !_.isString(spec.type)) {
			throw new Error('spec.type is required');
		}

		const channel = spec.channel;
		const type = spec.type;

		let object = {type, channel};
		let id;

		if (spec.id) {
			object.id = spec.id.replace(/spec$/, 'res');
		} else {
			id = uuid.v4();
			spec.id = `${id}-spec`;
			object.id = `${id}-res`;
		}

		service.bus
			.query({role: 'provider', cmd: 'get'}, {object, spec})
			.then(sourceObject => {
				if (sourceObject) {
					object = _.cloneDeep(sourceObject);
					object.channel = channel;
					object.type = type;
					return object;
				}

				// Remove the spec if the resource does not exist.
				service.bus.sendCommand({role: 'catalog', cmd: 'removeSpec'}, spec);

				return Promise.reject(Boom.resourceGone(
					'Resource for specification was not fetched from the provider'
				));
			})
			.then(() => {
				return service.bus.sendCommand(
					{role: 'store', cmd: 'set', type: `${type}Spec`},
					spec
				);
			})
			.then(spec => {
				spec.type = type;

				return service.bus
					.sendCommand({role: 'catalog', cmd: 'setItem'}, object)
					.then(_.constant(spec));
			});
	};

	commands.removeItemSpec = function removeItemSpec(args) {
		args = args || {};

		if (!args.channel || !_.isObject(args.channel)) {
			throw new Error('args.channel is required');
		}
		if (!args.type || !_.isString(args.type)) {
			throw new Error('args.type is required');
		}
		if (!args.id || !_.isString(args.id)) {
			throw new Error('args.id is required');
		}

		const type = args.type;

		const object = {
			channel: args.channel,
			type,
			id: args.id.replace(/spec$/, 'res')
		};

		// Remove the object for this spec if it exists.
		service.bus.sendCommand({role: 'catalog', cmd: 'removeItem'}, object);

		return service.bus
			.sendCommand({role: 'store', cmd: 'removeSpec', type: `${type}Spec`}, args)
			.then(_.constant(true));
	};

	return commands;
};

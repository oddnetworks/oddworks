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
			id: args.id.replace(/^res/, 'spec')
		};

		// Remove the spec for this object if it exists.
		service.bus.sendCommand(
			{role: 'store', cmd: 'remove', type: spec.type},
			spec
		);

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
		const objectType = type.replace(/Spec$/, '');
		let object = {channel, type: objectType};
		let objectId;
		let specId;

		if (spec.id) {
			specId = spec.id;
			object.id = specId.replace(/^spec/, 'res');
			objectId = object.id;
		} else {
			const id = uuid.v4();
			specId = `spec-${id}`;
			objectId = `res-${id}`;
		}

		service.bus
			.query({role: 'provider', cmd: 'get'}, {object, spec})
			.then(sourceObject => {
				if (sourceObject) {
					object = _.cloneDeep(sourceObject);
					object.channel = channel;
					object.type = objectType;
					object.id = objectId;
					object.spec = specId;

					return service.bus.sendCommand(
						{role: 'catalog', cmd: 'setItem'},
						object
					);
				}

				// Remove the spec and object if the source does not exist.
				if (spec.id) {
					service.bus.sendCommand(
						{role: 'catalog', cmd: 'removeSpec'},
						spec
					);
					service.bus.sendCommand(
						{role: 'catalog', cmd: 'removeItem'},
						object
					);
				}

				return Promise.reject(Boom.resourceGone(
					'Resource for specification was not fetched from the provider'
				));
			})
			.then(() => {
				spec.id = specId;
				return service.bus.sendCommand(
					{role: 'store', cmd: 'set', type},
					spec
				);
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
			type: type.replace(/Spec$/, ''),
			id: args.id.replace(/^spec/, 'res')
		};

		// Remove the object for this spec if it exists.
		service.bus.sendCommand(
			{role: 'store', cmd: 'remove', type: object.type},
			object
		);

		return service.bus
			.sendCommand({role: 'store', cmd: 'remove', type}, args)
			.then(_.constant(true));
	};

	return commands;
};

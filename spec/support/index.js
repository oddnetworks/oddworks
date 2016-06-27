'use strict';

const oddcast = require('oddcast');

exports.createBus = function createBus() {
	const bus = oddcast.bus();

	bus.events.use({}, oddcast.inprocessTransport());
	bus.commands.use({}, oddcast.inprocessTransport());
	bus.requests.use({}, oddcast.inprocessTransport());

	return bus;
};

'use strict';

const oddcast = require('oddcast');
const bus = oddcast.bus();

bus.events.use({}, oddcast.inprocessTransport());
bus.commands.use({}, oddcast.inprocessTransport());
bus.requests.use({}, oddcast.inprocessTransport());

module.exports = {bus};

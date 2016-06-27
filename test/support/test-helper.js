/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const path = require('path');
process.env.CONFIG = path.resolve(__dirname, './test-config.js');

const oddcast = require('oddcast');
const bus = oddcast.bus();

bus.events.use({}, oddcast.inprocessTransport());
bus.commands.use({}, oddcast.inprocessTransport());
bus.requests.use({}, oddcast.inprocessTransport());

module.exports = {bus};

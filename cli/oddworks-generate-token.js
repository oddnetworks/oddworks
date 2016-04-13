#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

const commander = require('commander');
const jwt = require('jsonwebtoken');
const chalk = require('chalk');

const COMMAND = 'generate-token';

commander
	.on('--help', () => {
		console.log('  Example Usage:');
		console.log('');
		console.log(`    oddworks ${COMMAND} -n odd-networks -d apple-ios`);
	});

commander
	.option('-n, --network <network>', 'network id to embed in the token')
	.option('-d, --device <device>', 'device id to embed in the token')
	.parse(process.argv);

if (commander.network && commander.device) {
	const payload = {
		version: 1,
		network: commander.network,
		device: commander.device,
		scope: ['device']
	};
	const token = jwt.sign(payload, process.env.JWT_SECRET);
	console.log('### Token Payload ###');
	console.log(chalk.green(JSON.stringify(payload)));
	console.log('');
	console.log('### JWT ###');
	console.log(chalk.green(token));
} else {
	commander.help();
}

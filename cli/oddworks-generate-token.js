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
		console.log( chalk.green(`    oddworks ${COMMAND} -n`, chalk.blue('odd-networks'), '-d', chalk.blue('apple-ios') ) );
		console.log('');
		console.log( chalk.green(' where', chalk.blue('odd-networks'), 'matches an id for a network record in your data store and') );
		console.log( chalk.green(' where', chalk.blue('apple-ios'), 'matches an id for a device record in your data store.') );
		console.log('');
		console.log('after generating the token create an entry in the device record for the jwt');
		console.log(chalk.green('ex:', chalk.magenta('"jwt" : <the freshly generated token>') ) );
		console.log('');
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

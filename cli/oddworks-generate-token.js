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
		console.log(chalk.green(`    oddworks ${COMMAND} -c`, chalk.blue('odd-networks'), '-p', chalk.blue('apple-ios')));
		console.log('');
		console.log(chalk.green('    where', chalk.blue('odd-networks'), 'matches an id for a channel record in your data store and'));
		console.log(chalk.green('    where', chalk.blue('apple-ios'), 'matches an id for a platform record in your data store.'));
	});

commander
	.option('-c, --channel <channel>', 'channel id to embed in the token')
	.option('-p, --platform <platform>', 'platform id to embed in the token')
	.parse(process.argv);

if (commander.channel && commander.platform) {
	const payload = {
		version: 1,
		network: commander.channel,
		device: commander.platform,
		scope: ['platform']
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

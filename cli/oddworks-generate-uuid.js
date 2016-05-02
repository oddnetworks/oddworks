#!/usr/bin/env node
'use strict';

const commander = require('commander');
const chalk = require('chalk');
const uuid = require('node-uuid');

commander
	.on('--help', () => {
		console.log('  Example Usage:');
		console.log('');
		console.log(`    oddworks generate-uuid -n 10`);
		console.log('');
		console.log('will generate a mostly random UUID for use as an object id');
		console.log('-number param is optional. The default is one uuid');
		console.log('');
	});

commander
	.option('-n, --number <number>', 'number of uuids to generate', parseInt)
	.parse(process.argv);

function createUniqueId() {
	return uuid.v4().replace(/-/g, '');
}

var iterations = 1;

if (Number.isInteger(commander.number) && commander.number > 0) {
	iterations = commander.number;
}

for (let i = 0; i < iterations; i++) {
	console.log(chalk.green('UUID:', chalk.cyan(createUniqueId())));
}

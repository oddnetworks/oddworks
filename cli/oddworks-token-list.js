#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

const commander = require('commander');
const jwt = require('jsonwebtoken');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// const COMMAND = 'token-list';

commander
	.on('--help', () => {
		console.log('  Example Usage:');
		console.log('');
		console.log(`    oddworks token-list`);
		console.log('');
		console.log('will list all available tokens based on the platform records in the data folder');
		console.log('this information is only valid for the in memory data store at this time');
		console.log('');
	});

commander.parse(process.argv);

var count = 0;

function parsePlatform(file) {
	if (path.extname(file) === '.json') {
		const platform = JSON.parse(fs.readFileSync('./data/platform/' + file, 'utf8'));

		const payload = {
			version: 1,
			channel: platform.channel,
			platform: platform.id,
			scope: ['platform']
		};

		const token = jwt.sign(payload, process.env.JWT_SECRET);
		console.log(chalk.green('channel:', chalk.cyan(payload.channel)));
		console.log(chalk.green('platform:', chalk.cyan(payload.platform)));
		console.log(chalk.green('token:', chalk.cyan(token)));
		console.log('');

		count++;
	}
}

fs.readdir('./data/platform', function (error, files) {
	if (error) {
		console.error(error);
	}

	if (files) {
		console.log('');
		console.log('Available Tokens');
		console.log('============================================');
		files.forEach(function (file) {
			parsePlatform(file);
		});
		console.log(`${count} tokens found`);
		if (count === 0) {
			console.log('To add new tokens create a platform file in the "data/platform" folder.');
		}
		console.log('');
	} else {
		console.log('');
		console.log(chalk.red('No Available Tokens'));
	}
});


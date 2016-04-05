#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

const commander = require('commander');
const jwt = require('jsonwebtoken');
const chalk = require('chalk');

commander
	.command('generate-device-token <network> <device>')
	.action((network, device) => {
		const payload = {
			version: 1,
			network,
			device,
			scope: ['device']
		};
		const token = jwt.sign(payload, process.env.JWT_SECRET);
		console.log('### JWT ###');
		console.log(chalk.green(token));
	});

commander
	.command('generate-user-token <network> <device> <user>')
	.action((network, device, user) => {
		const payload = {
			version: 1,
			network,
			device,
			user,
			scope: ['user']
		};
		const token = jwt.sign(payload, process.env.JWT_SECRET);
		console.log('### JWT ###');
		console.log(chalk.green(token));
	});

commander.parse(process.argv);

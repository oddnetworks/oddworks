#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

const commander = require('commander');
const jwt = require('jsonwebtoken');
const chalk = require('chalk');

commander
	.command('generate-token <organization> <device>')
	.action((organization, device) => {
		const payload = {
			version: 1,
			organization,
			device,
			scope: ['device']
		};
		const token = jwt.sign(payload, process.env.JWT_SECRET);
		console.log('### JWT ###');
		console.log(chalk.green(token));
	});

commander.parse(process.argv);

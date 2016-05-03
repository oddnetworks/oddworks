#!/usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

const commander = require('commander');

commander
	.usage('[cmd]')
	.command('generate-token', 'Generate a platform JWT for the channel and platform ids specified.')
	.command('token-list', 'List currently available JWT Tokens')
	.command('generate-uuid', 'Generate a mostly random UUID for use as an object id')
	.parse(process.argv);

'use strict';

const path = require('path');
const exec = require('child_process').exec;
const Promise = require('bluebird');
const test = require('tape');

const Postgres = require('../../lib/stores/postgres/postgres');
const postgresStore = require('../../lib/stores/postgres');

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgres://localhost/oddworks_test';
const DATABASE_NAME = POSTGRES_URL.split('/').pop();

const testHelper = require('../support/test-helper');

function promiseFromChildProcess(command) {
	return new Promise((resolve, reject) => {
		const proc = exec(command);

		proc.addListener('error', reject);
		proc.addListener('exit', code => {
			if (code === 0) {
				resolve();
			} else {
				reject();
			}
		});
	});
}

test('Postgres Store - Setup', t => {
	t.plan(1);
	const createdbFile = path.resolve(__dirname, '../../lib/stores/postgres/createdb.sql');

	promiseFromChildProcess(`dropdb ${DATABASE_NAME} --if-exists`)
		.then(() => promiseFromChildProcess(`createdb ${DATABASE_NAME}`))
		.then(() => promiseFromChildProcess(`psql -d ${DATABASE_NAME} -f ${createdbFile}`))
		.then(() => {
			console.info(`Setup: successfully set up ${DATABASE_NAME}`);

			return postgresStore.initialize(testHelper.bus, {postgres: Postgres.initialize(POSTGRES_URL), types: ['collection', 'promotion', 'video', 'view']});
		})
		.then(() => {
			console.info(`Setup: successfully initialized postgres store`);
			t.equal(postgresStore.name, 'postgres', 'is properly named');
			t.end();
		})
		.catch(e => {
			console.error(`Setup: an error occurred - ${e}`);
			t.end();
		});
});

test('Postgres Store - set', t => {
	t.plan(1);

	const payload = {
		id: '5aa0a979-218e-48d2-b353-3a6ad5752310',
		type: 'video',
		title: 'A Video'
	};

	testHelper.bus.sendCommand({role: 'store', cmd: 'set', type: 'video'}, payload).then(r => {
		t.ok(r, 'result');
		t.end();
	})
	.catch(e => {
		console.error(e);
		t.end();
	});
});

test('Postgres Store - get', t => {
	t.plan(1);

	const payload = {
		id: '5aa0a979-218e-48d2-b353-3a6ad5752310',
		type: 'video'
	};

	testHelper.bus.query({role: 'store', cmd: 'get', type: 'video'}, payload).then(r => {
		t.ok(r, 'result');
		t.end();
	})
	.catch(e => {
		console.error(e);
		t.end();
	});
});

test('Postgres Store - Teardown', t => {
	Postgres.close()
		.then(() => promiseFromChildProcess(`dropdb ${DATABASE_NAME} --if-exists`))
		.then(() => {
			console.info(`Teardown: successfuly dropped ${DATABASE_NAME}`);
			t.end();
		})
		.catch(e => {
			console.error(`Teardown: an error occurred - ${e}`);
			t.end();
		});
});

'use strict';

const Promise = require('bluebird');
const knex = require('knex');
const pg = require('pg');
const utils = require('../../utils');

function Postgres() {
	Object.defineProperties(this, {
		connection: {
			enumerable: true,
			writable: true,
			value: null
		}
	});

	return this;
}

utils.extend(Postgres.prototype, {
	initialize(config) {
		if (this.connection) {
			throw new Error('Postgres already initialized');
		}

		this.connection = knex({
			client: 'pg',
			connection: config || pg.defaults
		});

		return this;
	},

	close() {
		return new Promise((resolve, reject) => {
			if (this.connection) {
				this.connection.close();
				this.connection = null;

				resolve(true);
			} else {
				reject(new Error('Postgres has not been initialized'));
			}
		});
	}
});

exports = module.exports = new Postgres();

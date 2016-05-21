'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const utils = require('../../utils');
const uuid = require('node-uuid');

exports = module.exports = new FirebaseStore();

function FirebaseStore() {
	Object.defineProperties(this, {
		name: {
			enumerable: true,
			value: 'firebase'
		},
		_firebase: {
			enumerable: false,
			writable: true,
			value: undefined
		}
	});
}

function createSetter(db, type) {
	return payload => {
		// Make a copy to prevent unintended mutation.
		payload = _.cloneDeep(payload);
		payload.id = payload.id || uuid.v4();

		const typeRef = db.ref(type);

		return typeRef.child(payload.id).set(payload).then(() => {
			return payload;
		});
	};
}

function createGetter(db, type) {
	return payload => {
		const typeRef = db.ref(type);

		if (payload.id) {
			return typeRef.child(payload.id).once('value').then(snapshot => {
				return snapshot.val();
			});
		}

		return typeRef.once('value').then(snapshot => {
			const data = [];
			snapshot.forEach(obj => {
				data.push(obj);
			});
			return data;
		});
	};
}

// function createIndex(db, type) {
// 	return payload => {
// 		logger.debug(`createIndex: ${payload}`);
// 		return Promise.reject(new Error(`Not Implemented: Firebase Search`));
// 	};
// }

utils.extend(FirebaseStore.prototype, {
	initialize: (bus, options) => {
		if (options.firebase && options.types) {
			this._database = options.firebase.database();
			options.types.forEach(type => {
				bus.queryHandler({role: 'store', cmd: 'get', type}, createGetter(this._database, type));
				bus.queryHandler({role: 'store', cmd: 'set', type}, createSetter(this._database, type));
				bus.commandHandler({role: 'store', cmd: 'set', type}, createSetter(this._database, type));
				// bus.commandHandler({role: 'store', cmd: 'index', type}, createIndex(this._database, type));
			});
			return Promise.resolve(true);
		}

		return Promise.reject(new Error('missing required option(s)'));
	}
});

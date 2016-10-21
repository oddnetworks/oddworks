Testing
=======

### ES6 Arrow Functions
First __DON'T__ use arrow functions in `describe()`, `beforeAll()`, `beforeEach()`, `afterAll()`, `afterEach()`, or `it()` blocks. The reson is that the `this` object is set explicitly by Jasmine for those blocks so that `this` represents the same object throughout a test run, which can be [quite useful](http://jasmine.github.io/2.5/introduction.html#section-The_<code>this</code>_keyword). So, instead, the Jasmine test blocks should be setup the old school way.

This requires `/* eslint-disable max-nested-callbacks */` to be set at the top of the file.

Secondly, __DO__ use arrow functions in the callbacks within `beforeAll()` and `beforeEach()`. When you do that, the arrow function will reference the `this` object automatically set by Jasmine, allowing you to attach stuff to it.

```js
/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
'use strict';

describe('My thing', function () {
    let key = null;
    let subject = null;

    beforeAll(function (done) {
        // Assume this.createKey() was defined in the global test setup
        // beforeAll block for you to use here.
        key = this.createKey();

        return fetchSomething().then(something => {
            subject = something;
            subject.setKey(this.createKey());
        }).then(done).catch(this.handleError(done));
    });

    it('has correct key', function () {
        expect(subject.key).toBe(key);
    });
});
```

### Test Setup
Perform all asynchronous test setup tasks in a `beforeAll()` block within the `describe()` block where you intend to test it with `it()` blocks. This keeps all the asynchronous action in one place where it is easier to debug, and makes the rest of the test suite more readable.

Set your test subjects inside the `describe()` block using `let` statements, and set them initially to `null`. Then, within your `beforeAll()` block assign the actual values.

Use the Oddworks test error handler utility to make sure test setup errors are caught and eposed: `.then(done).catch(this.handleError(done));`. See examples below.

```js
/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const JSONSchemaValidator = require('jsonschema').Validator;
const fakeredis = require('fakeredis');
const MockExpressResponse = require('mock-express-response');
const Promise = require('bluebird');
const _ = require('lodash');
const redisStore = require('../../lib/stores/redis/');
const catalogService = require('../../lib/services/catalog');
const identityService = require('../../lib/services/identity');
const responseJsonApi = require('../../lib/middleware/response-json-api');
const jsonApiSchema = require('../helpers/json-api-schema.json');

const COLLECTION = require('../fixtures/collections/collection-0.json');
const REL_0 = require('../fixtures/videos/video-0.json');
const REL_1 = require('../fixtures/videos/video-1.json');
const REL_2 = require('../fixtures/videos/video-2.json');

const Validator = new JSONSchemaValidator();

Promise.promisifyAll(fakeredis.RedisClient.prototype);
Promise.promisifyAll(fakeredis.Multi.prototype);

describe('Middleware Response JSON API', function () {
    let bus = null;

    const REQ = {
        protocol: 'https',
        hostname: 'example.com',
        identity: {
            channel: {id: 'channel-id'},
            platform: {id: 'platform-id', platformType: 'APPLE_TV'}
        },
        socket: {
            address: () => {
                return {port: 3000};
            }
        },
        query: ''
    };

    beforeAll(function (done) {
        bus = this.createBus();

        // Kicking off the chain with Promise.resolve(null) makes
        // it easier to add more setup logic at the top of the chain
        // via copy and paste. It also makes it easier to visually
        // inspect the aync callback chain.
        return Promise.resolve(null)
            // Initialize a store
            .then(() => {
                return redisStore(bus, {
                    types: ['collection', 'video'],
                    redis: fakeredis.createClient()
                });
            })
            // Initialize an identity service
            .then(() => {
                return identityService(bus, {});
            })
            // Initialize the catalog service
            .then(() => {
                return catalogService(bus, {
                    updateFrequency: 1
                });
            })
            // Seed content
            .then(() => {
                const cmd = 'set';
                const role = 'store';

                return Promise.all([
                    bus.sendCommand({role, cmd, type: 'video'}, REL_0),
                    bus.sendCommand({role, cmd, type: 'video'}, REL_1),
                    bus.sendCommand({role, cmd, type: 'video'}, REL_2),
                    bus.sendCommand({role, cmd, type: 'collection'}, COLLECTION)
                ]);
            })
            // Using a no-op at the end of the chain helps to ensure
            // that no arguments will be pased to `done()`.
            .then(_.noop)
            .then(done)
            // We have a special error reporting utility to make it easier to // catch and read errors during test setup.
            .catch(this.handleError(done));
    });

    describe('with single resource', function () {
        let req = null;
        let res = null;
        let middleware = null;

        beforeAll(function (done) {
            req = _.cloneDeep(REQ);
            res = new MockExpressResponse();
            middleware = responseJsonApi({bus});

            return Promise.resolve(null)
                // Load seed data (without using include)
                .then(() => {
                    const role = 'store';
                    const cmd = 'get';
                    const type = 'collection';

                    const args = {
                        channel: 'channel-id',
                        type,
                        id: COLLECTION.id,
                        platform: 'platform-id'
                    };

                    return bus.query({role, cmd, type}, args).then(result => {
                        res.body = result;
                    });
                })
                .then(() => {
                    return middleware(req, res, err => {
                        if (err) {
                            return done.fail(err);
                        }
                        done();
                    });
                })
                .then(_.noop)
                .then(done)
                .catch(this.handleError(done));
        });

        it('formats response body to valid jsonapi.org schema', function () {
            const v = Validator.validate(res.body, jsonApiSchema);
            expect(v.valid).toBe(true);
        });

        it('has no includes array', function () {
            expect(res.body.includes).not.toBeDefined();
        });

        it('adds a meta block', function () {
            expect(res.body.meta).toEqual({channel: 'channel-id', platform: 'APPLE_TV'});
        });
    });

    describe('with included resources', function () {
        let req = null;
        let res = null;
        let middleware = null;

        beforeAll(function (done) {
            req = _.cloneDeep(REQ);
            req.query = {include: 'entities,video'};
            res = new MockExpressResponse();
            middleware = responseJsonApi({bus});

            return Promise.resolve(null)
                // Load seed data (without using include)
                .then(() => {
                    const role = 'store';
                    const cmd = 'get';
                    const type = 'collection';

                    const args = {
                        channel: 'channel-id',
                        type,
                        id: COLLECTION.id,
                        platform: 'platform-id',
                        include: ['entities']
                    };

                    return bus.query({role, cmd, type}, args).then(result => {
                        res.body = result;
                    });
                })
                .then(() => {
                    return middleware(req, res, err => {
                        if (err) {
                            return done.fail(err);
                        }
                        done();
                    });
                })
                .then(_.noop)
                .then(done)
                .catch(this.handleError(done));
        });

        it('formats response body to valid jsonapi.org schema', function () {
            const v = Validator.validate(res.body, jsonApiSchema);
            expect(v.valid).toBe(true);
        });

        it('has an includes array', function () {
            expect(Array.isArray(res.body.included)).toBe(true);
            expect(res.body.included.length).toBe(3);
        });

        it('adds a meta block', function () {
            expect(res.body.meta).toEqual({channel: 'channel-id', platform: 'APPLE_TV'});
        });
    });
});
```

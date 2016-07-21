/* global describe, beforeAll, it, expect */
/* eslint prefer-arrow-callback: 0 */
/* eslint-disable max-nested-callbacks */
'use strict';

const MockExpressResponse = require('mock-express-response');

const responseCacheControl = require('../../lib/middleware/response-cache-control');

describe('Middleware: Response Cache Control', () => {
	let req;
	let res;

	beforeAll(() => {
		req = {
			identity: {
				channel: {id: 'channel-id'},
				platform: {id: 'platform-id'}
			}
		};
		res = new MockExpressResponse();
	});

	it('applies defaults', () => {
		responseCacheControl()(req, res, () => {
			expect(res.get('Cache-Control')).toBe('public, max-age=600, stale-while-revalidate=604800, stale-if-error=604800');
		});
	});

	it('adds Surrogate Key header for single resource', () => {
		res.body = {id: 'resource-id', type: 'resource-type'};

		responseCacheControl({surrogateKey: true})(req, res, () => {
			const surrogateKey = res.get('Surrogate-Key');

			expect(surrogateKey.split(' ').length).toBe(9);

			expect(surrogateKey).toMatch('channel-id');
			expect(surrogateKey).toMatch('platform-id');
			expect(surrogateKey).toMatch('channel-id:platform-id');

			expect(surrogateKey).toMatch('resource-type');
			expect(surrogateKey).toMatch('channel-id:resource-type');
			expect(surrogateKey).toMatch('channel-id:platform-id:resource-type');

			expect(surrogateKey).toMatch('resource-id');
			expect(surrogateKey).toMatch('channel-id:resource-id');
			expect(surrogateKey).toMatch('channel-id:platform-id:resource-id');
		});
	});

	it('adds Surrogate Key header for listing resources', () => {
		res.body = [
			{id: 'resource-id-1', type: 'resource-type'},
			{id: 'resource-id-2', type: 'resource-type'},
			{id: 'resource-id-3', type: 'resource-type'}
		];

		responseCacheControl({surrogateKey: true})(req, res, () => {
			const surrogateKey = res.get('Surrogate-Key');

			expect(surrogateKey.split(' ').length).toBe(15);

			expect(surrogateKey).toMatch('channel-id');
			expect(surrogateKey).toMatch('platform-id');
			expect(surrogateKey).toMatch('channel-id:platform-id');

			expect(surrogateKey).toMatch('resource-type');
			expect(surrogateKey).toMatch('channel-id:resource-type');
			expect(surrogateKey).toMatch('channel-id:platform-id:resource-type');

			expect(surrogateKey).toMatch('resource-id-1');
			expect(surrogateKey).toMatch('channel-id:resource-id-1');
			expect(surrogateKey).toMatch('channel-id:platform-id:resource-id-1');

			expect(surrogateKey).toMatch('resource-id-2');
			expect(surrogateKey).toMatch('channel-id:resource-id-2');
			expect(surrogateKey).toMatch('channel-id:platform-id:resource-id-2');

			expect(surrogateKey).toMatch('resource-id-3');
			expect(surrogateKey).toMatch('channel-id:resource-id-3');
			expect(surrogateKey).toMatch('channel-id:platform-id:resource-id-3');
		});
	});
});

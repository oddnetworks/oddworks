'use strict';

const test = require('tape');

const lib = require('../../../lib/services/catalog/lib');

test('Catalog Service - composeMetaFeatures', t => {
	t.plan(5);

	const config = {
		features: {
			ads: {
				url: 'http://example.com?assetId={{= id}}'
			},
			sharing: {
				text: 'Now watching "{{= title}}!"'
			},
			metrics: {
				enabled: true
			},
			overlay: {
				image: 'http://overlays.example.com?id={{= id}}',
				some: {
					deep: {
						key: '{{= id}} {{= title}}'
					}
				}
			}
		}
	};

	const video = {
		id: '12345',
		title: 'Test video'
	};

	const metaFeatures = lib.composeMetaFeatures(video, config.features);

	t.equal(metaFeatures.ads.url, 'http://example.com?assetId=12345', 'ad url set with id');
	t.equal(metaFeatures.sharing.text, 'Now watching "Test video!"', 'sharing text set with title');
	t.equal(metaFeatures.overlay.image, 'http://overlays.example.com?id=12345', 'overlay image set');
	t.equal(metaFeatures.overlay.some.deep.key, '12345 Test video', 'deep key set');
	t.notOk(metaFeatures.metrics, 'metrics not set');
});

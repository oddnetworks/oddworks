'use strict';

const _ = require('lodash');
const request = require('request-promise');
const Promise = require('bluebird');
const logger = require('../../../../logger');

const DEFAULT_SEARCHABLE_TYPES = [];

function Provider(options) {
	this.spid = `vimeo-${Date.now()}`;
	this.options = options || {};

	if (!this.options.token) {
		return null;
	}

	return this;
}

module.exports = options => {
	return new Provider(options);
};

Provider.prototype = {
	fetch() {
		return request({
			method: 'GET',
			url: 'https://api.vimeo.com/me/videos',
			headers: {
				Authorization: `Bearer ${this.options.token}`
			}
		})
		.then(videos => {
			videos = JSON.parse(videos);
			return Promise.map(videos.data, video => {
				const id = video.uri.split('/')[2];

				return request({
					method: 'GET',
					url: `https://player.vimeo.com/video/${id}/config`,
					headers: {
						Authorization: `Bearer ${this.options.token}`
					}
				})
				.then(player => {
					video.player = JSON.parse(player);
					return video;
				});
			});
		})
		.then(videos => {
			return _.map(videos, this.transform.video);
		});
	},

	sync(bus) {
		this
			.fetch()
			.then(resources => {
				logger.debug(`${this.spid} - found ${resources.length} videos`);
				return _.each(resources, resource => {
					const isSearchable = _.chain(this.options).get('searchableTypes', DEFAULT_SEARCHABLE_TYPES).includes(resource.type).value();
					bus.sendCommand({role: 'catalog', cmd: 'create', searchable: isSearchable}, resource);
				});
			});
	},

	transform: {
		video(video) {
			const id = video.uri.split('/')[2];
			const image = _.find(video.pictures.sizes, {width: 1280});

			video = {
				id: `vimeo-${id}`,
				type: 'video',
				title: video.name,
				description: video.description,
				duration: video.duration,
				images: {
					aspect16x9: _.get(image, 'link', '')
				},
				url: video.player.request.files.hls.url
			};

			return video;
		}
	}
};

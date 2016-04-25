'use strict';

const _ = require('lodash');
const request = require('request-promise');
const Promise = require('bluebird');

function Provider(options) {
	this.options = options || {};

	if (!this.options.token) {
		return null;
	}

	return this;
}
module.exports = Provider;

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
		return true;
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

			console.log(video);
			return video;
		}
	}
};

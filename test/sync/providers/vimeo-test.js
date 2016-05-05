'use strict';

const test = require('tape');

const vimeo = require('../../../services/sync/providers').vimeo({token: '12345'});
const videoFixture = require('../fixtures/vimeo-video.json');

test('Vimeo Sync: init', t => {
	t.plan(2);

	t.ok(vimeo.spid, 'sets a sync provider id on the instance');
	t.ok(vimeo.options.token, 'sets the token for use');
	t.end();
});

test('Vimeo Sync: transform.video', t => {
	t.plan(7);

	const video = vimeo.transform.video(videoFixture);

	t.equal(video.id, 'vimeo-106415933', 'id is set');
	t.equal(video.type, 'video', 'type is set');
	t.equal(video.title, '3RM Paused Hang Clean at 205#', 'title is set');
	t.equal(video.description, 'Focused on not hopping forward. ', 'desc is set');
	t.equal(video.duration, 69, 'duration is set');
	t.equal(video.images.aspect16x9, 'https://i.vimeocdn.com/video/489523138_1280x720.jpg?r=pad', 'image is set');
	t.equal(video.url, 'https://skyfiregce-a.akamaihd.net/exp=1461685669~acl=%2F%2A%2F106415933%2F%2A~hmac=eb7ace0d23bc0f44b089396122720572bdb01f5ab17e719d5fd3420777feaea4/2tierchgci/106415933/video/288685220,288685224/master.m3u8', 'url is set');
	t.end();
});

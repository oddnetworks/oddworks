'use strict';

const test = require('tape');
const sinon = require('sinon');

const testHelper = require('../test-helper');
const eventsService = require('../../services/events');

const analyzers = [{
	send(payload) {
		return payload;
	}
}, {
	send(payload) {
		return payload;
	}
}, {
	forward(payload) {
		return payload;
	}
}];

test('EVENTS SERVICE', t => {
	eventsService.initialize(testHelper.bus, {analyzers});
	t.end();
});

test(`{role: 'events', cmd: 'log'}`, t => {
	t.plan(3);

	const spy1 = sinon.spy(analyzers[0], 'send');
	const spy2 = sinon.spy(analyzers[1], 'send');
	const spy3 = sinon.spy(analyzers[2], 'forward');

	const payload = {
		distinctId: 131313,
		sessionId: 99999,
		contentId: 'daily-show-video-1',
		contentType: 'video',
		title: 'Daily Show 1',
		action: 'video:play',
		network: 'odd-networks',
		device: 'apple-ios',
		category: 'MOBILE',
		elapsed: 10000,
		duration: 60000
	};

	testHelper.bus.observe({role: 'events', cmd: 'log'}, () => {
		t.ok(spy1.calledOnce, 'analyzer 1 .send() called');
		t.ok(spy2.calledOnce, 'analyzer 2 .send() called');
		t.ok(spy3.notCalled, 'analyzer 3 .send() does not exist and .forward() not called');

		analyzers[0].send.restore();
		analyzers[1].send.restore();
		analyzers[2].forward.restore();
		t.end();
	});

	testHelper.bus.broadcast({role: 'events', cmd: 'log'}, payload);
});

# Events Service

Acts as a proxy to send event data off to 3rd party analytics services.

## Initialization

**Options**

* `redis` - the instance of Redis used to store events for later aggregation
* `analyzers` - array of [analyzers](/analyzers) that will be sent event payloads

## Patterns

### observe({role: 'events'}, payload)

## Router

### POST /events

## Analyzers

Right now there is official support for 2 analyzers. However, you can implement your own analyzer as long as it exposes a `.send(payload)` method for the Event Service to call and the payload has all the required data for that analyzer then it will send.

### Google Analytics

**Analyzer Usage**

```js
eventsService.initialize(bus, {
	redis,
	analyzers: [
		eventsService.analyzers.googleAnalytics({trackingId: process.env.GA_TRACKING_ID})
	]
})
```

**Payload**

* `action`
* `contentType`
* `contentId`
* `platformType`
* `organization`
* `sessionId` _optional_
* `geoId` _optional_
* `ip` _optional_
* `userAgent` _optional_

### Mixpanel

**Analyzer Usage**

```js
eventsService.initialize(bus, {
	redis,
	analyzers: [
		eventsService.analyzers.mixpanel({apiKey: process.env.MIXPANEL_API_KEY, timeMultiplier: 1000})
	]
})
```

**Payload**

* `action`
* `distinctId`
* `contentType`
* `contentId`
* `platformType`
* `organization`
* `elapsed`
* `duration`
* `geoId` _optional_
* `ip` _optional_
* `userAgent` _optional_

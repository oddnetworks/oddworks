# Events Service

Acts as a proxy to send event data off to 3rd party analytics services.

## Patterns

**observe({role: 'events'}, payload)**

## Router

**POST /events**

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

**Required Payload**

* sessionId
* contentType
* contentId
* deviceType
* organization
* action
* geoId
* ip
* userAgent

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

**Required Payload**

* distinctId
* contentType
* contentId
* deviceType
* organization
* action
* geoId
* ip
* userAgent
* elapsed
* duration

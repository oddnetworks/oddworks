# Sync Service

Acts as a proxy to fetch and sync collections and videos from 3rd party provider APIs.

## Initialization

**Options**

* `interval` - the interval to run each provider instance in milliseconds
* `providers` - array of [providers](/providers) that expose a `spid` property and `sync()` method.

**Service Usage**

Pass an array of provider instances for the Sync Service to run. Multiple instances are allowed.

```js
syncService.initialize(bus, {
	interval: 5000,
	providers: [
		syncService.providers.vimeo({token: process.env.VIMEO_APIKEY_ONE}),
		syncService.providers.vimeo({token: process.env.VIMEO_APIKEY_TWO}),
		syncService.providers.vimeo({token: process.env.VIMEO_APIKEY_THREE}),
		myCustomProvider({key: process.env.CUSTOM_API_KEY})
	]
})
```

## Patterns

### observe({role: 'sync'}, payload)

**Payload**

* `spid` - the sync provider id of the running instance to run

## Providers

- [vimeo](https://github.com/oddnetworks/oddworks/tree/master/lib/services/sync/providers/vimeo)
- more coming soon...

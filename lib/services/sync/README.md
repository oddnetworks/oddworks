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

Right now there is official support for 1 provider. However, you can implement your own provider as long as it exposes a `.sync()` method for the Sync Service to call.

### Vimeo

**Provider Usage**

```js
const vimeo = syncService.providers.vimeo({token: process.env.VIMEO_APIKEY});
```

**Properties**

* `spid` - typically generated with the format `PROVIDER_TYPE-CURRENT_TIMESTAMP` for referencing the running instance (this allows for running multiple instances of the same provider)
* `options` - whatever options were passed to the provider in the first place when initializing

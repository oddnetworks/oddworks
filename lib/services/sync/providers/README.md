# sync service providers

Right now there is official support for 1 provider. However, you can implement your own provider as long as it exposes a `.sync()` method for the Sync Service to call.

### Vimeo

**Provider Usage**

```js
const vimeo = syncService.providers.vimeo({token: process.env.VIMEO_API_TOKEN});
```

**Properties**

* `spid` - typically generated with the format `PROVIDER_TYPE-CURRENT_TIMESTAMP` for referencing the running instance (this allows for running multiple instances of the same provider)
* `options` - whatever options were passed to the provider in the first place when initializing

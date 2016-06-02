# Vimeo

**Provider Usage**

```js
const vimeo = syncService.providers.vimeo({token: process.env.VIMEO_APIKEY, searchableTypes: ['video']});
```

**Properties**

* `spid` - typically generated with the format `PROVIDER_TYPE-CURRENT_TIMESTAMP` for referencing the running instance (this allows for running multiple instances of the same provider)
* `options`
    * `token` - your Vimeo user's API token. See [Vimeo API - Authentication](https://developer.vimeo.com/api/authentication#generate-tokens)
    * `searchableTypes` - an array of the resource types you would like to be searchable. *NOTE* one of your stores must support indexing. The default value is `[]`.

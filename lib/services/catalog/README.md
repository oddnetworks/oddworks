# Catalog Service

Core service for dealing with catalog related resources like videos and collections.

## Patterns

### query({role: 'catalog', cmd: 'fetch'}, payload)

Fetches resources from the catalog.

**Payload**

* `type`
* `id` _optional_ - if specified it will fetch a single resource, otherwise it will return all resources of the `type` specified

#### Video Feature Flags

When fetching a video resource it will be attached with `meta.features` that are requested from **{role: 'identity', cmd: 'config'}**. However, only subset of the feature flags will be applied that pertain to the video resource.

* ads
* sharing
* player
* overlay

Each of these will also be run through string interpolator to save the client platform from having to do so. A perfect use case for this is for giving the client platform a fully rendered ad URL. Most ad networks require the video ID be attached as a query parameter so it knows which ads to serve for that specific video. So the URL from the ad network will look something like `http://ads.example.com?assetId=[YOUR ID HERE]`.

All you will have to do is set the feature flags on your `channel` and/or `platform` resource as the following:

```json
"ads": {
	"enabled": true,
	"url": "http://ads.example.com?assetId={{= id}}"
}
```

Here `{{= id}}` will get replaced by the video ID. You can use the `{{= PROP}}` to interpolate any property from the video. So the next time you fetch this video from the catalog it will look like the following.

```json
"id": "12345",
"type": "video",
"title": "My Awesome Video",
"meta": {
	"features": {
		"ads": {
			 "enabled": true,
			 "url": "http://ads.example.com?assetId=12345"
		}
	}
}
```

Now your client platform doesn't have to read the ad URL and do its own string interpolation. It can just use that ad URL without worry.

### sendCommand({role: 'catalog', cmd: 'create'[, searchable: true]}, payload)

Creates a resource in the catalog. Specifying `searchable: true` will call the **{role: 'catalog', cmd: 'index'}** pattern.

**Payload**

* `type`
* `id` _optional_ - if specified it will fetch a single resource, otherwise it will return all resources of the `type` specified

### query({role: 'catalog', cmd: 'search'}, payload)

Searches for resources indexed in the catalog.

**Payload**

* `query` - the text to search

### sendCommand({role: 'catalog', cmd: 'index'}, payload)

Indexes the resource with the `title` and `description` as the searchable text.

**Payload**

* `id` - the id of the resource
* `type` - the type of the resource

## Router

Very basic `GET` routes for each of the resources with optional `id`.

### GET /videos/(:id)

### GET /collections/(:id)

### GET /views/(:id)

### GET /promotions/(:id)

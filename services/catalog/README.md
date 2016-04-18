# Catalog Service

Core service for dealing with catalog related resources like videos and collections.

## Patterns

### query({role: 'catalog', cmd: 'fetch'}, payload)

Fetches resources from the catalog.

**Payload**

* `type`
* `id` _optional_ - if specified it will fetch a single resource, otherwise it will return all resources of the `type` specified

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
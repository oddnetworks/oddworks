# Stores

Stores are the generic implementation within Oddworks to persist data to a database. We aim to optimize for read speed so we base our stores on key/value patterns.

## Initialization

Each store's implementation will require different initialization options. For example our [Redis](redis) and [Redis Search](redis-search) stores both require a Redis instance to work with. Our [Memory](memory) store does not need an instance of anything.

**Options**

* `types` - array of resource types the store is responsible for working with

Specifying different stores for different types means Oddworks is flexible enough to store identity resources in Redis and all catalog resources in MongoDB if you feel that suits your needs best.

More stores to come...

## Patterns

### query({role: 'store', cmd: 'get', type: TYPE}, payload)

Get a single or all resources of a specific `type`.

**Payload**

* `type` - the type of the resource you want to get
* `id` _optional_ - specify the id of the resource to get just that resource

**Result**

* `object|[objects]`

### query({role: 'store', cmd: 'set', type: TYPE}, payload)

Set a single resource to the database. You may also use `sendCommand` instead of `query`.

**Payload**

This is the bare minimum each resource requires. You may add as many other properties as you wish.

* `id` - the id of the resource
* `type` - the type of the resource

**Result**

* `object`

### sendCommand({role: 'store', cmd: 'index', type: TYPE}, payload)

Index a resource to be searchable later.

**Payload**

* `id` - the id of the resource
* `text` - the text that will be searchable for the resource

**Result**

* `[objects]`

### query({role: 'store', cmd: 'query'}, payload)

Search the index of all types based on the provided string.

**Payload**

This is the bare minimum each resource requires. You may add as many other properties as you wish.

* `query` - the text to search for

**Result**

* `[objects]`
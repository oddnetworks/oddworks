# Stores

Stores are the generic implementation within Oddworks to persist data to a database. A design goal of Oddworks is optimize for read speed, so stores are based on key/value patterns.

A store will implement get, set, scan, remove and batchGet methods. Instead of calling those methods directly, a store exposes its implementation through an [Oddcast Message Bus](https://github.com/oddnetworks/oddcast). The message bus allows the implementation of stores to be decoupled from the core of your application.

## Specification
There is a generic store specification that any store must implement to work within Oddworks.

### Initialization
Requiring a store must return a factory function. Calling that function will initialize the store and return a Promise for an Object with at least a `.name` String attribute, but may include other attributes as well.

The factory function for a store requires two arguments:

* bus - An implementation of an [Oddcast Message Bus](https://github.com/oddnetworks/oddcast)
* options - An Object hash of options

Each store's implementation will require different initialization options. For example, a Redis or PostgreSQL connection. But, there is one required option.

**Options**

* `options.types` - array of record types the store is responsible for working with

Specifying different stores for different types means Oddworks is flexible enough to store identity records in Redis and all catalog records in MongoDB if depending on requirements of the application.

### Patterns
[Oddcast Message Bus](https://github.com/oddnetworks/oddcast) patterns are used to call methods on a store. This design allows stores to be decoupled from the application logic, and allows you to use different stores for different types of objects.

#### get
`bus.query({role: 'store', cmd: 'get', type: TYPE}, args)`

Get a single record of a specific `TYPE`.

**Args**

* `channel` - the channel ID String the record is scoped to
* `type` - the type String of the record
* `id` - the id String of the record

The `args` Object must have an `.id`, `.type`, and `.channel` attribute. However, if the record being requested is a "channel" type, then the `args.channel` attribute is not required.

**Result**

* An Object with at least `{channel, type, id}`

#### set
`bus.sendCommand({role: 'store', cmd: 'set', type: TYPE}, payload)`

**Payload**

* `channel` - the channel ID String the record is scoped to
* `type` - the type String of the record
* `id` - the id String of the record

This is the bare minimum each record requires. You may add as many other properties as you wish.

**Result**

* The Object that was set

#### remove
`bus.sendCommand({role: 'store', cmd: 'remove', type: TYPE}, args)`

Remove a single record of a specific `TYPE`.

**Args**

* `channel` - the channel ID String the record is scoped to
* `type` - the type String of the record
* `id` - the id String of the record

The `args` Object must have an `.id`, `.type`, and `.channel` attribute. However, if the record being removed is a "channel" type, then the `args.channel` attribute is not required.

**Result**

* A Boolean

#### scan
`bus.query({role: 'store', cmd: 'scan', type: TYPE}, args)`

Scans for records of a specific `TYPE`.

**Args**

* `channel` - the channel ID String the record is scoped to
* `type` - the type String of the record
* `id` - the id String of the record
* `limit` - the Number to limit results. Defaults to 10

The `args` Object must have an `.id`, `.type`, and `.channel` attribute. However, if the record being requested is a "channel" type, then the `args.channel` attribute is not required.

**Result**

* An Array of Objects with at least `{channel, type, id}`

#### batchGet
`bus.query({role: 'store', cmd: 'batchGet', type: TYPE}, args)`

Scans for records of a specific `TYPE`.

**Args**

* `channel` - the channel ID String the record is scoped to
* `keys` - An Array of keys to get. Each key in the Array must be an Object in the form `{type: TYPE, id: ID}`.

**Result**

* An Array of Objects with at least `{channel, type, id}`

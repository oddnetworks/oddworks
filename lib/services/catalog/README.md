# Catalog Service
Core service for working with catalog related resources like videos and collections.

The resource types managed by the catalog service can be named just about anything, but by default the service is usually setup to handle views, collections, and videos.

The catalog also has a way of continually syncing the resources it manages from an upstream source of content. You can bind a "spec" object to any resource and define a provider for it which you can use to fetch the resource from anwhere else to keep your Oddworks catalog up to date in real time. See [Providers and Specs](#providers-and-specs) below for more information.

Instead of calling catalog methods directly, the catalog service, like all Oddworks services, exposes its implementation through an [Oddcast Message Bus](https://github.com/oddnetworks/oddcast). The message bus allows the implementation of services to be decoupled from the core of your application.

## Specification
There is a generic service specification that any service must implement to work within Oddworks.

### Initialization
Requiring a a service must return a factory function. Calling that function will initialize the service and return a Promise for an Object with at least a `.name` String attribute, but may include other attributes as well.

The factory function for a service requires two arguments:

* bus - An implementation of an [Oddcast Message Bus](https://github.com/oddnetworks/oddcast)
* options - An Object hash of options

**Options**

* options.updateFrequency - A Number from 0 to 1 indicating to the service how often to update content from an upstream source. See [Providers and Specs](#providers-and-specs) below for more info.

**Result**
A catalog service Object:

```js
{
    name: 'catalog',
    options: {},
    bus,
    CatalogItemController,
    CatalogListController,
    CatalogSpecController,
    CatalogSpecListController,
    CatalogSearchController,
    router
};
```

### Patterns
[Oddcast Message Bus](https://github.com/oddnetworks/oddcast) patterns are used to call methods on a service. This design allows services to be decoupled from the application logic, and allows you to use different services for different operations.

During initialization the catalog service defines handlers for the following patterns.

#### fetchItem
`bus.query({role: 'catalog', cmd: 'fetchItem'}, args)`

Fetch a single content item.

**Args**

* args.channel - Object *required*
* args.type - String *required*
* args.id - String *required*
* args.platform - Object *required*
* args.user - Object
* args.include - Array of String types to include

**Result**

* An Object with at least `{channel, type, id, meta}`

**Feature Flags**

When fetching a catalog resource it will be decorated with `meta` Object requested from **{role: 'identity', cmd: 'config'}**. The provided channel, platform and user objects will be used to compose the `meta` Object using a merge algorithm.

#### fetchItemList
`bus.query({role: 'catalog', cmd: 'fetchItemList'}, args)`

Fetch a list of content items.

**Args**

* args.channel - Object *required*
* args.type - String *required*
* args.platform - Object *required*
* args.user - Object
* args.include - Array of String types to include on each returned resource
* args.limit - A Number to limit the result set by

**Result**

* An Array of Objects with at least `{channel, type, id, meta}`

#### setItem
`bus.sendCommand({role: 'catalog', cmd: 'setItem'}, payload)`

**Payload**

* payload.channel - String *required*
* payload.type - String *required*

This is the bare minimum each resource requires. You may add as many other properties as you wish.

**Result**

* The Object that was set

#### removeItem
`bus.sendCommand({role: 'catalog', cmd: 'removeItem'}, args)`

Delete a single content item.

**Args**

* args.channel - String *required*
* args.type - String *required*
* args.id - String *required*

**Result**

* A Boolean

#### fetchItemSpec
`bus.query({role: 'catalog', cmd: 'fetchItemSpec'}, args)`

Fetch a spec for a single content item.

**Args**

* args.channel - Object *required*
* args.type - String *required*
* args.id - String *required*

**Result**

* A spec Object as defined by the application

#### fetchItemSpecList
`bus.query({role: 'catalog', cmd: 'fetchItemSpecList'}, args)`

Fetch a list of content specs.

**Args**

* args.channel - Object *required*
* args.type - String *required*
* args.limit - A Number to limit the result set by

**Result**

* An Array of spec Objects as defined by the application

#### setItemSpec
`bus.sendCommand({role: 'catalog', cmd: 'setItemSpec'}, payload)`

**Payload**

* payload.channel - String *required*
* payload.source - String *required*
* payload.type - String *required* Must end with "Spec". ex "collectionSpec"

This is the bare minimum each resource requires. You may add as many other properties as you wish.

Before the spec object is set in the store, "setItemSpec" will attempt to retrieve the associated resource from the provider indicated with `payload.source`. If the resource does not exist, this spec Object will not be persisted to the store.

**Result**

* The spec Object that was set

If the resource is successfuly returned from the provider, it will be persisted to the store along with the spec Object. The spec Object will have an id String prefixed with "spec-" and the resource will have an id String prefixed with "res-".

#### removeItemSpec
`bus.sendCommand({role: 'catalog', cmd: 'removeItemSpec'}, args)`

Delete a single content item spec.

**Args**

* args.channel - String *required*
* args.type - String *required*
* args.id - String *required*

**Result**

* A Boolean

### Default Routes
The catalog service object returned from the initialization factory function exposes a method named `.router()`. It takes some options, including a router you may have already defined, and adds some standard default routes for convenience.

#### router
`.router(OPTIONS)`

**Options**

* options.types - Array of Strings. Default = ['collection', 'promotion', 'video', 'view']
* options.specTypes - Array of Strings. Default = []
* options.router - An Express Router Object/Function. This could be a Router instance, or an Express App instance. Default = new Router.

**Returns**

Returns either the router you specified in the options, or a new Router instance.

**Defined Routes**

* GET, PUT, DELETE on the list route for each type and spec type.
* GET, PATCH, DELETE on the item route for each type and spec type.

### Providers and Specs
Resources managed by the catalog may optionally have "spec" (specification) Objects associated with them. Spec Objects indicate to the catalog service that there is an upstream source it can use to fetch fresh copies of a resource and cache in the store.

During `fetchItem`, if a resource Object is fetched and it contains both a `.spec` and `.meta.maxAge` attribute, the catalog may fetch the spec Object and pass it into an application defined provider to retrieve the resource Object.

The `.spec` spec id attribute will be set by the setItemSpec handler when it first fetches and persists the resource in the store.

The `.meta.maxAge` attribute could be set by the provider or configured on the channel or platform Objects in the identity service.

#### Caching and Refresh
When a resource is set in the catalog, setItem automatically sets the `.meta.updatedAt` attribute. When the resource is fetched from the catalog with fetchItem and the `.meta.maxAge` has expired when compared to `.meta.updatedAt`, then the resource will be requested fresh from the provider defined in its spec Object.

If the resource object has a `meta.staleWhileRevalidate` attribute and the time is still within the configured window, it will return the stale resource Object while fetching the fresh one from the provider in the background and caching it for the next request.

To avoid an angry mob rushing the upstream source server the `options.updateFrequency` option can be set to something less than 1. If updateFrequency is set to 0 then the provider will never be called, even if the maxAge has expired. If updateFrequency is set to 1, then the provider will always be called if the maxAge has expired. If the updateFrequency is set to 0.5 then this particular running instance will only request the resource from the provider 50% of the time when maxAge has expired.

* .meta.updatedAt - Date ISO String
* .meta.maxAge - Number of seconds to live.
* .meta.staleWhileRevalidate - Number of seconds to serve stale.

#### Spec
A spec Object is basically just a bag of arbitrarily defined attributes to be passed into the provider. The only requirements are:

* .channel - Channel id String *required*
* .source - Provider name String *required*
* .type - Spec type String *required* Must end with "Spec". ex "collectionSpec"

The resource Object type will be automatically derived from the `spec.type` String. For example: If the `spec.type` String is "collectionSpec" then the resources returned by the provider for that spec will automatically be assigned the type "collection".

#### Providers
A provider is an application defined service which simply answers to the Oddcast pattern `bus.query({role: 'provider', cmd: 'get', source: SOURCE}, {spec: SPEC, object: OBJECT})`. The SOURCE is the name of the provider, SPEC is the SPEC Object for the resource, and OBJECT is the {channel, type, id} of the requested resource.

A simple filesystem provider could be implemented like this:
```js
bus.queryHandler({role: 'provider', cmd: 'get', source: 'fs'}, function (args) {
    const spec = args.spec;
    const object = args.object;
    const filpath = spec.basePath + '/' + object.type + '/' + spec.resource;
    const options = {encoding: spec.encoding};
    const maxAge = spec.ttl;

    return new Promise(function (resolve, reject) {
        fs.readFile(filepath, options, function (err, jsonText) {
            if (err) {
                console.error(err.stack);
                resolve(null);
            } else {
                const resource = JSON.parse(jsonText);
                // Configure the maxAge on the resource by using the ttl
                // defined on the spec Object
                resource.meta.maxAge = maxAge;
                resource.meta.staleWhileRevalidate = 120;
                resolve(resouce);
            }
        });
    });
});
```

Notice how the fs provider is using arbitrarily defined attributes `.basePath`, `.resource`, `.encoding` and `.ttl` from the spec. This demonstrates the flexibility of using spec objects. They're basically used to pass arbitrary arguments into your provider.

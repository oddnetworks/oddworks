# Changelog

## 3.3.0

- Handle special case of [JSON API links in config](https://github.com/oddnetworks/oddworks/commit/f67ae7f61010d740099d26909e1b78bd6449b218) response
- Fixes JSON API response middleware bugs
- Limit attributes [assigned to resource object meta](https://github.com/oddnetworks/oddworks/commit/12c113766e3e2433235e5c03d73dc94e9567ffe5)
- Fixes the include=foo query parameter in CatalogListController and CatalogItemController

## 3.2.2 Unstable

- Adds a type and id property to config objects for JSON API readiness.

## 3.2.0 Unstable

- Fixes a [promise chaining error](https://github.com/oddnetworks/oddworks/pull/100/commits/8e156a8497231aad74fea35ce2d92af01ae955c3)
- Fixes a [promise returning warning](https://github.com/oddnetworks/oddworks/pull/100/commits/525e25bef8f3ea8451ec2926d57bb834c9bb1e6e)
- Adds a [CloudSearch Store](https://github.com/oddnetworks/oddworks/pull/100/commits/5163b532668417d2d88491c37e0ac4cca9edadf8)

## 3.1.1 Unstable

- Moves the identity service middleware into the middleware library. [Pull Request](https://github.com/oddnetworks/oddworks/pull/97)
- Fixes [events service dependency](https://github.com/oddnetworks/oddworks/pull/98).
- Fixes a [DynamoDB marshalling bug](https://github.com/oddnetworks/oddworks/pull/96/commits/45bd9d13c7e90acc8f770196412729f006a2c1e1).
- Fixes a few [bugs in the catalog service](https://github.com/oddnetworks/oddworks/commit/05d414ccc64e6d5d10f8b94fc13070f941a3ae12).

## 3.0.0 Unstable

- Stores and Services are now consistently initialized with a [single factory function](https://github.com/oddnetworks/oddworks/issues/89).
- A default API is now exposed to [write data to both the identity and catalog services](https://github.com/oddnetworks/oddworks/blob/master/lib/services/identity/README.md#authentication).
- [Sync service is deprecated](https://github.com/oddnetworks/oddworks/issues/39) in favor of the [Provider](https://github.com/oddnetworks/oddworks/tree/master/lib/services/catalog#providers-and-specs) caching system.
- The [x-access-token header is deprecated in favor of the Authorization header](https://github.com/oddnetworks/oddworks/issues/83)
- [Token scopes](https://github.com/oddnetworks/oddworks/issues/45) are [now defined](https://github.com/oddnetworks/oddworks/blob/master/lib/services/identity/README.md#authentication) in the JSON Web Token audience (`.aud`) member.
- Stores now [filter resources based on channel](https://github.com/oddnetworks/oddworks/issues/60)
- Stores now implement a [scan method](https://github.com/oddnetworks/oddworks/issues/88) for fetching multiple records by type.
- Stores now support an [include argument](https://github.com/oddnetworks/oddworks/issues/90) for fetching related records.
- The event service is deprecated.
- A [DynamoDB store](https://github.com/oddnetworks/oddworks/issues/82) was added.
- The [JSON API service is deprecated](https://github.com/oddnetworks/oddworks/issues/91) in favor of using request/response middleware instead.
- The [Logging service is deprecated](https://github.com/oddnetworks/oddworks/issues/94).
- New [Request Controller Classes](https://github.com/oddnetworks/oddworks/issues/92).
- Tests are now [authored using Jasmine](https://github.com/oddnetworks/oddworks/issues/87) instead of tape.

## 2.2.1

- Fixed issue with links for included resource entities #74
- Fixed Google events analyzer (will actually `send()` events now)
- Documentation improvements

## 2.2.0

- Documentation improvements
- Added `oddworks.logger`, an extensible [winston](https://www.npmjs.com/package/winston) instance
- Added partials as factories to create getter/setter on stores, eliminating the need to pass in an entity type when creating or querying for it
- Added protection for options hashes passed into services, avoiding reference errors
- Refactored some code around Promises, reducing nested code and extra, unnecessary turns of the event loop
- Refactored prototype assignments so as not to override global Object.prototype

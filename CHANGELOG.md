# Changelog

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

- Fixed issue with links for included resource entitites #74
- Fixed Google events analyzer (will actually `send()` events now)
- Documentation improvements

## 2.2.0

- Documentation improvements
- Added `oddworks.logger`, an extensible [winston](https://www.npmjs.com/package/winston) instance
- Added partials as factories to create getter/setter on stores, eliminating the need to pass in an entity type when creating or querying for it
- Added protection for options hashes passed into services, avoiding reference errors
- Refactored some code around Promises, reducing nested code and extra, unnecessary turns of the event loop
- Refactored prototype assignments so as not to override global Object.prototype

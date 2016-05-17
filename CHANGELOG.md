# Changelog

## 2.2.0

- Documentation improvements
- Added `oddworks.logger`, an extensible [winston](https://www.npmjs.com/package/winston) instance
- Added partials as factories to create getter/setter on stores, eliminating the need to pass in an entity type when creating or querying for it
- Added protection for options hashes passed into services, avoiding reference errors
- Refactored some code around Promises, reducing nested code and extra, unnecessary turns of the event loop
- Refactored prototype assignments so as not to override global Object.prototype

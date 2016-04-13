# JSON API Service

Transforms the data on `res.body` into [JSON API](http://jsonapi.org) format.

## Patterns

### observe({role: 'json-api', cmd: 'included'}, payload)

Fetches the resources from the Catalog Service of the relationships you want to include as part of the JSON API response.

**Payload**

* `include` - the comma-separated `relationships` you want to fetch resources for

**Result**

* `objects` - the array of the fetched resources

## Middlware

This is what actually does the transformation of `res.body` into JSON API format.

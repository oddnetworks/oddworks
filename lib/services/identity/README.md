# Identity Service
Core service for working with identity related resources like channels and platforms.

First, a definition of terms:

* A channel represents a single media property. For example: A publisher named Marvel may have a Spider Man channel and a Captain America channel.
* A platform represents a consumer facing device class like Roku or iPhone.

Instead of calling identity methods directly, the identity service, like all Oddworks services, exposes its implementation through an [Oddcast Message Bus](https://github.com/oddnetworks/oddcast). The message bus allows the implementation of services to be decoupled from the core of your application.

## Specification
There is a generic service specification that any service must implement to work within Oddworks.

### Initialization
Requiring a a service must return a factory function. Calling that function will initialize the service and return a Promise for an Object with at least a `.name` String attribute, but may include other attributes as well.

The factory function for a service requires two arguments:

* bus - An implementation of an [Oddcast Message Bus](https://github.com/oddnetworks/oddcast)
* options - An Object hash of options

**Options**

* options.jwtIssuer - The JWT issuer String to use. Default = 'urn:oddworks'.
* options.jwtSecret - *required* The JWT signing secret string.

**Result**
An identity service Object:

```js
{
    name: 'identity',
    options: {},
    bus,
    IdentityListController,
    IdentityItemController,
    IdentityConfigController,
    middleware,
    router
};
```

### Patterns
[Oddcast Message Bus](https://github.com/oddnetworks/oddcast) patterns are used to call methods on a service. This design allows services to be decoupled from the application logic, and allows you to use different services for different operations.

During initialization the identity service defines handlers for the following patterns.

#### verify
`bus.query({role: 'identity', cmd: 'verify'}, args)`

Decode and verify an encoded JSON Web Token String, then fetch the referenced channel, platform and user resources if they exist.

**Args**

* args.token - JSON Web Token encoded String

**Returns**
An Identity Object:

```js
{
    audience: ['platform'], // The audience Array
    channel: channel, // The Channel resource
    platform: platform, // The Platform resource
    user: user // The User resource
}
```

Rejects with an Error if any of the referenced resources cannot be found in the store.

#### sign
`bus.query({role: 'identity', cmd: 'sign'}, args)`

**Args**
* args.audience - Array of Strings *required*.
* args.subject - String *required if admin*.
* args.channel - String *required if non admin*
* args.platform - String *required if non admin*
* args.user - String

See [Authentication](#authentication) below for more info.

**Returns**

#### config
`bus.query({role: 'identity', cmd: 'config'}, args)`

Merges the channel, platform and user objects into a single config object.

**Args**

* args.channel - Channel Object
* args.platform - Platform Object
* args.user - User Object

**Returns**
A config Object.

#### middlware.authenticate
`bus.query({middleware: 'authenticate'}, options)`

See [Middleware](#middleware) below for more info.

**Options**

* options.header - The HTTP header to use for the JWT. Default = 'Authorization';

**Returns**
Middleware Function.

#### middlware.authorize
`bus.query({middleware: 'authorize'}, options)`

See [Middleware](#middleware) below for more info.

**Options**

* options.audience - Allowed audience Object hash.

**Returns**
Middleware Function.

### Middleware
The identity service object returned from the initialization factory function exposes a nested object of `.middleware` which contains middleware factory functions.

#### authenticate
`.middleware.authenticate(OPTIONS)`

**Options**

* options.header - The header String on which to look for the JWT. Default = 'Authorization'.

**Returns**
A new middleware Function with the signature `authenticateMiddleware(req, res, next)`.

**Example**
```js
app.use(service.middleware.authenticate({header: 'x-access-token'}));
```

For more info see [Authentication](#authentication) below.

#### authorize
`.middleware.authorize(OPTIONS)`

**Options**

* options.audience - Object *required*. A hash of the HTTP methods authorized for a route, each containing an Array of audiences allowed to access the HTTP method.

**Returns**
A new middleware Function with the signature `authorizeMiddleware(req, res, next)`.

**Example**
```js
router.all(
  '/channels',
  service.middleware.authorize({audience: {
    get: ['admin', 'platform'],
    post: ['admin']
  }}),
  IdentityListController.create()
);
```

This example configuration would allow only requests with a JWT audience (`.aud`) of 'admin' to make POST requests to '/channels'. It would allow both 'admin' and 'platform' to make GET requests to '/channels'.

Methods not defined in the audience hash return an HTTP status code 405 Method Not Allowed.

If a request contains a JWT with an audience not defined for the method it is requesting then an HTTP status code 403 Forbidden is returned.

For more info see [Authentication](#authentication) below.

### Default Routes
The identity service object returned from the initialization factory function exposes a method named `.router()`. It takes some options, including a router you may have already defined, and adds some standard default routes for convenience.

#### router
`.router(OPTIONS)`

**Options**

* options.types - Array of Strings. Default = ['channel', 'platform']
* options.router - An Express Router Object/Function. This could be a Router instance, or an Express App instance. Default = new Router.

**Returns**

Returns either the router you specified in the options, or a new Router instance.

**Defined Routes**

* GET, PUT, DELETE on the list route for each type.
* GET, PATCH, DELETE on the item route for each type.

## Authentication
Oddworks is designed to support authentication to a service using [JSON Web Tokens](https://jwt.io/introduction/) (JWTs). A decoded Oddworks JWT will take 1 of 3 forms:

Admin
```js
iss: 'STRING options.jwtIssuer',
sub: 'USER DEFINED STRING',
aud: ['admin', 'platform']
```

Platform, no user
```js
iss: 'STRING options.jwtIssuer',
aud: ['platform'],
channel: 'STRING - channel id',
platform: 'STRING - platform id'
```

Platform, with user
```js
iss: 'STRING options.jwtIssuer',
aud: ['platform'],
channel: 'STRING - channel id',
platform: 'STRING - platform id',
user: 'STRING - user.id'
```

An important consideration is that the Oddworks library can support two "servers": One for the consumer devices to access and consume content, and another admin "backend" API for server side tools to configure and update the content. In most cases, both of these concerns will be mixed on the same server instance, so there is some care taken to make sure that requests are authenticated and authorized properly.

The two types of services (consumer and admin) are represented on a JWT the audience member (`.aud`). This property is an array of strings representing the audiences for which the caller has access rights for. The audience strings supported by Oddworks out of the box are:

* 'platform' - The consumer facing API accessed by devices to consume content.
* 'admin' - The backend API accessed by other machines to configure content.

Notice that platform consumer JWTs do not have a subject (`.sub`) member. This is because the combined channel, platform and user IDs compose the subject, so we don't want to mix concerns.

### Authenticating Middleware
The authenticate middlware is constructed using

    bus.query({middleware: 'authenticate'}, OPTIONS)

It is expected that the encoded JWT string is sent to the server on the Authorization header by default:

    "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJh..."

Other headers can be used instead by setting the `options.header` String when constructing the authenticate middleware with `bus.query({middleware: 'authenticate'}, OPTIONS)`.

The authenticate middleware parses the header, then calls

    bus.query({role: 'identity', cmd: 'verify'}, {token})

to parse and verify the token. This returns an Object from the identity service:

```js
{
    audience: ['platform'], // The audience Array
    channel: channel, // The Channel resource
    platform: platform, // The Platform resource
    user: user // The User resource
}
```

This "identity" Object is assigned to the request as `req.identity` for use in middleware and route handlers. This is important because it allows other parts of the request/response cycle to fetch, configure and decorate the response without having to fetch fresh copies of the audience, channel, platform or user objects.

### Authorizing Middleware
The authorizing middlware is constructed using

    bus.query({middleware: 'authorize'}, OPTIONS)

It is expected that the request has already passed through the authenticating middleware and the `req.identity` Object is present. The authenticating middleware then checks to see if the requested HTTP method can be called by members of the given audience(s) on the assigned route.

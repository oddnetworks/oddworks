# Identity Service

Core service for dealing with networks and devices.

## Initialization

**Options**

* `jwtSecret` - the secret string used to sign and verify JWTs

## Patterns

### query({role: 'identity', cmd: 'verify'}, payload)

Verify the JWT to ensure it was signed correctly and the network and device exist.

**Payload**

* `token` - the JWT you want to verify

**Result**

* `network`
* `device`

### query({role: 'identity', cmd: 'config'}, payload)

Verify the JWT to ensure it was signed correctly and the network and device exist.

**Payload**

* `network` - the id of the network
* `device` - the id of the device

**Result**

* `features` - the merged result of all resource → device → network feature keys
* `views` - the view ids for the device

## Middlware

### verifyAccess(options)

This will verify that the JWT used to make the request is valid. If it is then it will attach the found `network` and `device` objects onto `req.identity` for future reference, otherwise, it will throw a `HTTP 401`.

**Options**

* `header` - (default: 'x-access-token') the header key where the JWT is stored

## Router

### GET /config

Responds with the result from the **{role: 'identity', cmd: 'config'}** pattern using the `req.identity` information for `network` and `device`.
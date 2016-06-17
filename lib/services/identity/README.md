# Identity Service

Core service for dealing with channels and platforms.

## Initialization

**Options**

* `jwtSecret` - the secret string used to sign and verify JWTs

## Patterns

### query({role: 'identity', cmd: 'verify'}, payload)

Verify the JWT to ensure it was signed correctly and the channel and platform exist.

**Payload**

* `token` - the JWT you want to verify

**Result**

* `channel`
* `platform`

### query({role: 'identity', cmd: 'config'}, payload)

Verify the JWT to ensure it was signed correctly and the channel and platform exist.

**Payload**

* `channel` - the id of the channel
* `platform` - the id of the platform

**Result**

* `features` - the merged result of all resource → platform → channel feature keys
* `views` - the view ids for the platform

## Middleware

### authorize()

This will verify that the JWT used to make the request is valid. If it is then it will attach the found `channel` and `platform` objects onto `req.identity` for future reference, otherwise, it will throw a `HTTP 401`.

The `Authorization: Bearer TOKEN` header pattern is used to send the JWT.

## Router

### GET /config

Responds with the result from the **{role: 'identity', cmd: 'config'}** pattern using the `req.identity` information for `channel` and `platform`.

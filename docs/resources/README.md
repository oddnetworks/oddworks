# Resources

- [__Channel__](#channel)
- [__Platform__](#platform)
- [__Viewer__](#viewer)
- [__Config__](#config)
- [__View__](#view)
- [__Video__](#video)
- [__Collection__](#collection)
- [__Progress__](#progress)
- [__Promotion__](#promotion)
- [__Non-Resource Objects__](#non-resource-objects)

## Channel

__Type:__ `channel`

### Attributes

- __id__ String - the server's identifier for the Channel
- __title__ String
- __active__ Boolean
- __display__ Object
    - __images__ Array - contains [Image](#image) objects.
    - __colors__ Array - contains [Color](#color) objects.
    - __fonts__ Array - contains [Font](#font) objects
- __features__ [Features](#features)
    - __ads__ [Ads](#ads)
    - __authentication__ [Authentication](#authentication)
    - __sharing__ [Sharing](#sharing)
    - __metrics__ [Metrics](#metrics)

## Platform

__Type:__ `platform`

### Attributes

- __id__ String - the server's identifier for the Platform
- __title__ String - `Apple|Android|Web|Roku|Xbox`
- __category__ String - `WEB|TV|MOBILE`
- __active__ Boolean
- __display__ Object
    - __images__ Array - contains [Image](#image) objects.
    - __colors__ Array - contains [Color](#color) objects.
    - __fonts__ Array - contains [Font](#font) objects
- __features__ [Features](#features)
    - __ads__ [Ads](#ads)
    - __authentication__ [Authentication](#authentication)
    - __sharing__ [Sharing](#sharing)
    - __metrics__ [Metrics](#metrics)
- __views__ Object - a simple key/value object to determine the name (key) and id (value) of the Views available

## Viewer

__Type:__ `viewer`

### Attributes

- __id__ String - the server's identifier for the Viewer
- __channel__ String
- __active__ Boolean
- __entitlements__ Array - list of string entitlement properties the viewer has

### Relationships

- __platforms__ Object - the viewer's currently "linked" platforms they have logged in with
- __watchlist__ Object - collections and videos the viewer has set to "watch later"

## Config

__Type:__ `config`

Config object attributes determine which features and configuration details are available to a given Platform.

### Attributes

- __active__ Boolean
- __display__ Array - computed from [Channel](#channel) and [Platform](#platform) objects
- __features__ Object - computed from [Channel](#channel) and [Platform](#platform) objects
- __views__ Object - set from [Platform](#platform) object
- __jwt__ String

## View

__Type:__ `view`

View object attributes determine how to present the related data

### Attributes

- __channel__ String
- __title__ String
- __images__ Array - contains [Image](#image) objects.

### Relationships

A View's most important data is it's `relationships`. These are user-defined relationships which can contain arbitrary references to other resources from the same Channel.

## Video

__Type:__ `video`

### Attributes

- __channel__ String
- __title__ String
- __description__ String
- __images__ Array - contains [Image](#image) objects.
- __sources__ Array - contains one or more [Source](#source) objects.
- __duration__ Integer - the duration of the video in milliseconds. Default: `0`
- __genres__ Array - contains a string of genres.
- __cast__ Array - contains [Cast](#cast) objects.
- __releaseDate__ String - ISO 8601 date string.

### Relationships

- __related__ - The `related` relationship is used to define which resources are in some way related to the video (same collection, user suggestion, similar attributes to another video, etc.). These can be `video` or `collection` resource types.

## Collection

__Type:__ `collection`

### Attributes

- __channel__ String
- __title__ String
- __description__ String
- __images__ Array - contains [Image](#image) objects.
- __genres__ Array - contains a string of genres.
- __releaseDate__ String - ISO 8601 date string.

### Relationships

- __entities__ - The `entities` relationship is used to define which resources are contained within the collection. These can be `video` or `collection` resource types.
- __featured__ - The `featured` relationship is used to define which resources are a featured part of the collection. These can be `video` or `collection` resource types.

## Progress

__Type:__ `progress`

### Attributes

- __channel__ String
- __viewer__ String
- __video__ String
- __position__ Integer - the current position of the viewer's progress on the video. Default: `0`
- __complete__ Boolean - has the viewer completed watching the video. Default: `false`

## Promotion

__Type:__ `promotion`

### Attributes

- __channel__ String
- __title__ String
- __description__ String
- __images__ Array - contains [Image](#image) objects.
- __url__ String

## Non-Resource Objects

These are objects common to multiple different Resource objects.

### Image

Some resources contain an array of images.

- __url__ String - required
- __mimeType__ String - Example: `image/png`
- __width__ Integer - Example: `1280`
- __height__ Integer - Example: `720`
- __label__ String - required. Example: `box-art`

### Source

- __url__ String - required
- __container__ String - Example: `hls`
- __mimeType__ String - Example: `application/x-mpegURL`
- __height__ Integer
- __width__ Integer
- __maxBitrate__ Integer - the maximum bitrate in kbps. Example: `3000`. Default: `0`
- __label__ String - required. Example: `censored`

### Cast

Some resources contain an array of casts.

- __name__ String
- __role__ String
- __character__ String

### Color

- __red__ Integer
- __green__ Integer
- __blue__ Integer
- __alpha__ Integer
- __label__ String

### Font

// TODO - figure this out

- __name__
- __size__
- __label__

### Identifier

An identifier object is used as a reference to full resource objects. These are most commonly used in a resource's `relationships.data`

- __id__ String - can be a slug-ified string or a UUID
- __type__ String - must be one of the Oddworks resource types

### Features

#### Ads

- __enabled__ Boolean
- __type__ String

__*__ _Any additional properties will be a String_

#### Authentication

- __enabled__ Boolean
- __type__ String

__*__ _Any additional properties will be a String_

#### Sharing

- __enabled__ Boolean
- __text__ String - Example: `Watch the @oddnetworks show live on mobile and TV connected devices!`

#### Metrics

- __enabled__ Boolean
- userAgent String - The user agent string to be used when posting events
- __appInit__ Object
    - __action__ String - Default: `app:init`
    - __enabled__ Boolean
- __viewLoad__ Object
    - __action__ String - Default: `view:load`
    - __enabled__ Boolean
- __videoLoad__ Object
    - __action__ String - Default: `video:load`
    - __enabled__ Boolean
- __videoPlay__ Object
    - __action__ String - Default: `video:play`
    - __enabled__ Boolean
- __videoPlaying__ Object
    - __action__ String - Default: `video:playing`
    - __enabled__ Boolean
    - __interval__ Integer - time in milliseconds
- __videoStop__ Object
    - __action__ String - Default: `video:stop`
    - __enabled__ Boolean
- __videoError__ Object
    - __action__ String - Default: `video:error`
    - __enabled__ Boolean
- __userNew__ Object
    - __action__ String - Default: `user:new`
    - __enabled__ Boolean

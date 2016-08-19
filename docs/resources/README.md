# Resources

- [__Config__](#config)
- [__View__](#view)
- [__Video__](#video)
- [__Collection__](#collection)
- [__Non-Resource Objects__](#non-resource objects)

## Config

__Type:__ `config`

Config object attributes determine which features and configuration details are available to a given Platform.

### Attributes

- __channel__ [String]
- __title__ [String]
- __active__ [Boolean]
- __images__ [Array] - contains [Image](#image) objects.
- __features__ [Object]
    - __authentication__ [Authentication](#authentication)
    - __sharing__ [[Sharing]](#sharing)
    - __metrics__ [[Metrics]](#metrics)
- __platformType__ [[String]] - the server's identifier for the requesting Platform's type
- __category__ [String] - the server's identifier for the requesting Platform's category (WEB|TV|MOBILE)
- __views__ [Object] - a simple key/value object to determine the name (key) and id (value) of the Views available to the requesting Platform
- __user__ [Object]
    - __id__ [String]
    - __channel__ [String]
    - __type__ [String]
- __jwt__ [String]

## View

__Type:__ `view`

View object attributes determine how to present the related data

### Attributes

- __channel__ [String]
- __title__ [String]
- __images__ [Array] - contains [Image](#image) objects.

### Relationships

A View's most important data is it's `relationships`. These are user-defined relationships which can contain arbitrary references to other resources from the same Channel.

## Video

__Type:__ `video`

### Attributes

- __channel__ [String]
- __title__ [String]
- __description__ [String]
- __images__ [Array] - contains [Image](#image) objects.
- __sources__ [Array] - contains one or more [Source](#source) objects.

### Relationships

- __related__ - The `related` relationship is used to define which resources are in some way related to the video (same collection, user suggestion, similar attributes to another video, etc.). These can be `video` or `collection` resource types.

## Collection

__Type:__ `collection`

### Attributes

- __channel__ [String]
- __title__ [String]
- __description__ [String]
- __images__ [Array] - contains [Image](#image) objects.

### Relationships

- __entities__ - The `entities` relationship is used to define which resources are contained within the collection. These can be `video` or `collection` resource types.
- __featured__ - The `featured` relationship is used to define which resources are a featured part of the collection. These can be `video` or `collection` resource types.

## Non-Resource Objects

These are objects common to multiple different Resource objects.

### Image

Some resources contain an array of images.

- __url__ [String]
- __mimeType__ [String] - example `image/png`
- __width__ [Integer] - example `1280`
- __height__ [Integer] - example `720`
- __label__ [String] - example `box-art`

### Source

- __url__ [String]
- __container__ [String] - example `hls`
- __mimeType__ [String] - example `application/x-mpegURL`
- __label__ [String] - example `censored`

### Identifier

An identifier object is used as a reference to full resource objects. These are most commonly used in a resource's `relationships.data`

- __id__ [String] - can be a slug-ified string or a UUID
- __type__ [String] - must be one of the Oddworks resource types

### Authentication

- __enabled__ [Boolean]

What else goes here?

### Sharing

- __enabled__ [Boolean]
- __text__ [String] - example: `Watch the @oddnetworks show live on mobile and TV connected devices!`

### Metrics

- __enabled__ [Boolean]
- __appInit__ [Object]
    - __action__ [String] - default: `app:init`
    - __enabled__ [Boolean]
- __viewLoad__ [Object]
    - __action__ [String] - default: `view:load`
    - __enabled__ [Boolean]
- __videoLoad__ [Object]
    - __action__ [String] - default: `video:load`
    - __enabled__ [Boolean]
- __videoPlay__ [Object]
    - __action__ [String] - default: `video:play`
    - __enabled__ [Boolean]
- __videoPlaying__ [Object]
    - __action__ [String] - default: `video:playing`
    - __enabled__ [Boolean]
    - __interval__ [Integer] - time in milliseconds
- __videoStop__ [Object]
    - __action__ [String] - default: `video:stop`
    - __enabled__ [Boolean]
- __videoError__ [Object]
    - __action__ [String] - default: `video:error`
    - __enabled__ [Boolean]
- __userNew__ [Object]
    - __action__ [String] - default: `user:new`
    - __enabled__ [Boolean]

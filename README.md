# Oddworks

[![pipeline status](https://gitlab.com/oddnetworks/oddworks/core/badges/master/pipeline.svg)](https://gitlab.com/oddnetworks/oddworks/core/commits/master)
[![Dependency Status](https://david-dm.org/oddnetworks/oddworks.svg)](https://david-dm.org/oddnetworks/oddworks)

__Oddworks__ is an open source video distribution platform built to destroy the barriers to streaming television. Use it to:

* Deliver your video content to TV connected platforms like Apple TV and Roku.
* Proxy, cache, and bend the space time continuum between your content management system and existing online video platform (Vimeo, YouTube, Ooyala, Brightcove).
* Aggregate usage metrics from your video apps to expand viewership and create custom viewing experiences.
* Distribute content from multiple sources out to your social channels.

_Become your own video distribution channel!_

## Table of contents

* [Documentation](#documentation)
* [Platform](#platform)
* [Platform SDKs](#platform-sdks)
* [Technology](#technology)
* [Versioning](#versioning)
* [Motivation](#motivation)
* [Community](#community)
* [License](#license)

## Documentation

Oddworks is made up of several loosely coupled services. All of these services are automatically installed as dependencies when you install Oddworks. Oddworks uses [NPM](https://www.npmjs.com/) for dependency and package management (see [Technology](#technology) below).

### [stores](https://gitlab.com/oddnetworks/oddworks/core/tree/master/lib/stores)

The content server is also database agnostic in which you can store your entities in whatever database engine you like or a combination of any.

Currently Oddworks has support for the following:

- memory (best used for development and testing)
- redis
- redis-search (a full text search implementation based on the N-gram algorithm)
- DynamoDB

The implementation of these can be found in the `./lib/stores` directory.

### [services](https://gitlab.com/oddnetworks/oddworks/core/tree/master/lib/services)

- [catalog](https://gitlab.com/oddnetworks/oddworks/core/blob/master/lib/services/catalog) (responsible for views, collections, and videos)
- [identity](https://gitlab.com/oddnetworks/oddworks/core/blob/master/lib/services/identity) (responsible for channels, platforms, viewers, authentication, and entitlements)
- [server](https://gitlab.com/oddnetworks/oddworks/core/blob/master/lib/services/identity) (a Node.js HTTP server)

The implementation of these can be found in the `./lib/services` directory.

### middleware

The available middleware is used when setting up an [Express.js](http://expressjs.com/) HTTP server.

The implementation of these can be found in the `./lib/middleware` directory.

## Platform

The Oddworks Platform consists of two main concepts:

1. The __Oddworks Content Server__ which maintains a database of your content and provides it to your apps via a strictly specified [JSON API](http://jsonapi.org/).
2. The __Oddworks platform SDKs__ which are designed to consume the content from the Oddworks Content Server as well as report usage data back to it.

### Using oddworks

#### Installing

```
> npm install @oddnetworks/oddworks
```

In your server script:

```
const oddworks = require('@oddnetworks/oddworks');
```

### CLI

The [Oddworks CLI](https://gitlab.com/oddnetworks/oddworks/core-cli) is also available

```
> npm install -g @oddnetworks/oddworks-cli
```

### Example Content Server Implementations

Current example content server implementations can be found (with their instructions) here:

- [example-single-process](https://github.com/oddnetworks/example-single-process)
- [example-multi-process](https://github.com/oddnetworks/example-multi-process)

## platform SDKs

* [Apple iOS & tvOS SDK](https://gitlab.com/oddnetworks/oddworks/core-ios-tvos-sdk) Used for iPhone, iPad, and Apple TV.
* [Android SDK](https://gitlab.com/oddnetworks/oddworks/core-android-sdk) Used for mobile, tablet, Android TV, and Fire TV.
* [Roku SDK](https://github.com/oddnetworks/odd-roku-sdk)
* [JavaScript SDK](https://github.com/oddnetworks/odd-javascript-sdk) for use in [Windows Universal](https://msdn.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide) and web applications.

In addition to the SDKs there are plans to have open source sample apps which leverage the SDKs available to you as well. You could use these as reference implementations, a hobby project, or make some tweaks and ship your own streaming channel!

Although the source repositories are not open source yet there are some [downloads available now](https://www.oddnetworks.com/documentation/sampleapps/) from the website.

## Technology

The Oddworks Platform is written for the [Node.js](https://nodejs.org/) runtime, and uses the well known [Express.js](http://expressjs.com/) framework for HTTP communication.

Oddworks is designed to be database agnostic so long as the underlying database can support JSON document storage, including some RDMSs like PostgreSQL. Currently the only supported and tested database is Redis.

Although communication between the platforms and the REST API is typically done in a synchronous way, the inner guts of the system is designed to communicate via asynchronous message passing. This makes it easier to extend the platform with plugins and other loosely coupled modules without worrying about upstream changes like you would in tightly coupled platforms.

## Versioning

For transparency into our release cycle and in striving to maintain backward compatibility, Oddworks is maintained under [the Semantic Versioning guidelines](http://semver.org/).

## Motivation

The Oddworks Platform was designed and developed by [Odd Networks](https://www.oddnetworks.com/) to lower the barrier for developers and content owners to create your own streaming content channel. Based on our experience in video gaming we thought that TV could use a big improvement. We believe in the future of television and, with the Oddworks open source platform, we hope you'll make that future a reality.

We proudly stand behind our open source work and, in addition to maintaining the Oddworks project, Odd Networks also provides hosted services, a Pro Dashboard, a Live Stream Generator, and a Recommendation Service.

Check out [www.oddnetworks.com](https://www.oddnetworks.com/)

## Community

Get updates on Odd Networks's development and chat with the project maintainers and community members.

* [Contribute] (http://github.com/oddnetworks/oddworks/tree/master/CONTRIBUTING.md)
* Follow [@oddnetworks on Twitter](https://twitter.com/Oddnetworks).
* Submit an [issue](https://gitlab.com/oddnetworks/oddworks/core/issues).
* Read and subscribe to [The Odd Networks Tech Blog](http://oddcast.oddnetworks.com/).

## More Information

For additional help getting [up and running with Oddworks have a look at this blog post](https://medium.com/@OddNetworks/up-and-running-with-the-oddworks-server-199c897c4224#.n0pes4t1n)

## [Changelog](http://github.com/oddnetworks/oddworks/tree/master/CHANGELOG.md)

## License

Apache 2.0 © [Odd Networks](http://oddnetworks.com)

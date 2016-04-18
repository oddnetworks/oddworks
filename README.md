![Oddworks](http://s3-us-west-2.amazonaws.com/odd-networks-assets/odd-networks.png)

[![Build Status](https://travis-ci.org/oddchannels/oddworks.svg?branch=master)](https://travis-ci.org/oddchannels/oddworks)

__Oddworks__ is an open source video distribution platform built to destroy the barriers to streaming television. Use it to:

* Deliver your video content to TV connected platforms like Apple TV and Roku.
* Proxy, cache, and bend the space time continuum between your content management system and existing online video platform (Vimeo, YouTube, Ooyala, Brightcove).
* Aggregate usage metrics from your video apps to expand viewership and create custom viewing experiences.
* Distribute content from multiple sources out to your social channels.

_Become your own video distribution channel!_

## Table of contents

* [Platform](#platform)
* [Content Server](#content-server)
* [platform SDKs](#platform-sdks)
* [Technology](#technology)
* [Versioning](#versioning)
* [Motivation](#motivation)
* [Community](#community)
* [License](#license)

## Platform
The Oddworks Platform consists of two main concepts:

1. The __Oddworks Content Server__ which maintains a database of your content and provides it to your apps via a strictly specified [JSON API](http://jsonapi.org/).
2. The __Oddworks platform SDKs__ which are designed to consume the content from the Oddworks Content Server as well as report usage data back to it.

## Content Server

### Running

#### First Time Setup

Clone the repo to your machine and run the following commands.

```
> npm install // Install all the dependancies
> npm run setup // Sets up environment variables and the CLI
```

#### Starting the Development Server

```
> npm run dev // Run in development mode and watches for file changes
```

The server should be running at http://localhost:3000 with all the required data seeded into the databases. Next you can hit the API however you want. Here is an example curl command with a preset token we generated for you.

```
> curl -X GET -H "x-access-token: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2ZXJzaW9uIjoxLCJvcmdhbml6YXRpb24iOiJvZGQtbmV0d29ya3MiLCJkZXZpY2UiOiJhcHBsZS1pb3MiLCJzY29wZSI6WyJkZXZpY2UiXSwiaWF0IjoxNDU4NTg5OTgwfQ.Tps_LBrTsMvN7Axx27mea3lUx1Q-ujZKY1cJ3AbHTOM" -H "Accept: application/json" -H "Cache-Control: no-cache" "http://localhost:3000/videos"
```

### CLI

The server also comes with a built-in CLI to aid in some common tasks you will need to do like generating platform token to distribute. More documentation is coming, but you can see the available commands by running the following:

```
> oddworks --help
```

### About

The Oddworks Content Server is made up of several loosely coupled services.

- Identity (responsible for channels, platforms, users, authentication, and entitlements)
- Catalog (responsible for views, collections, and videos)
- JSON API (responsible for decorating responses into the JSON API Spec format)

The implementation of these can be found in the `/services` folder.

The content server is also database agnostic in which you can store your entitles in whatever database engine you like or a combination of any.

Currently we have official support for the following:

- In-memory (best used for development and testing)
- Redis
- Redis Search (a full text search implementation based on the N-gram algorithm)
- MongoDB (coming soon)
- Elasticsearch (coming soon)

With the stores above you can pick your poison for your specific needs.

The implementation of these can be found in the `/stores` folder.

All of these components are automatically installed as dependencies when you setup the Oddworks Content Server. Oddworks uses [NPM](https://www.npmjs.com/) for dependency and package management (see [Technology](#technology) below).

## platform SDKs

* [Apple iOS & tvOS SDK](https://github.com/oddchannels/oddworks-ios-tvos-sdk) Used for iPhone, iPad, and Apple TV.
* [Android SDK](https://github.com/oddchannels/oddworks-android-sdk) Used for mobile, tablet, Android TV, and Fire TV.

Coming soon:

* Roku SDK
* JavaScript SDK for use in [Windows Universal](https://msdn.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide) and web applications.

In addition to the SDKs there are plans to have open source sample apps which leverage the SDKs available to you as well. You could use these as reference implementations, a hobby project, or make some tweaks and ship your own streaming channel!

Although the source repositories are not open source yet there are some [downloads available now](https://www.oddchannels.com/documentation/sampleapps/) from the website.

## Technology

The Oddworks Platform is written for the [Node.js](https://nodejs.org/) runtime, and uses the well known [Express.js](http://expressjs.com/) framework for HTTP communication.

Oddworks is designed to be database agnostic so long as the underlying database can support JSON document storage, including some RDMSs like PostgreSQL. Currently the only supported and tested database is MongoDB.

Although communication between the platforms and the REST API is typically done in a synchronous way, the inner guts of the system is designed to communicate via asynchronous message passing. This makes it easier to extend the platform with plugins and other loosely coupled modules without worrying about upstream changes like you would in tightly coupled platforms.

## Versioning

For transparency into our release cycle and in striving to maintain backward compatibility, Oddworks is maintained under [the Semantic Versioning guidelines](http://semver.org/).

## Motivation

The Oddworks Platform was designed and developed by [Odd channels](https://www.oddchannels.com/) to lower the barrier for developers and content owners to create your own streaming content channel. Based on our experience in video gaming we thought that TV could use a big improvement. We believe in the future of television and, with the Oddworks open source platform, we hope you'll make that future a reality.

We proudly stand behind our open source work and, in addition to maintaining the Oddworks project, Odd channels also provides hosted services, a Pro Dashboard, a Live Stream Generator, and a Recommendation Service.

Check out [www.oddchannels.com](https://www.oddchannels.com/)

## Community

Get updates on Odd channel's development and chat with the project maintainers and community members.

* Follow [@oddchannels on Twitter](https://twitter.com/Oddchannels).
* Join [the official Slack room](http://slack.oddchannels.com/).
* Submit an [issue](https://github.com/oddchannels/oddworks/issues).
* Check out the [API sample responses](https://www.oddchannels.com/documentation/oddworks/).
* Read and subscribe to [The Official Odd channels Blog](http://blog.oddchannels.com/).

## License

Apache 2.0 © [Odd channels](http://oddchannels.com)

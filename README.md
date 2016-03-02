![Oddworks](http://s3-us-west-2.amazonaws.com/odd-networks-assets/odd-networks.png)

__Oddworks__ is an open source video distribution platform built to destroy the barriers to streaming television. Use it to:

* Deliver your video content to TV connected devices like __Apple TV__ and __Roku__.
* Proxy, cache, and __bend the space time continuum__ between your content management system and existing online video platform (Vimeo, YouTube, Ooyala, Brightcove).
* Aggregate usage metrics from your video apps to __expand viewership__ and __create custom viewing experiences__.
* Distribute content from __multiple sources__ out to your __social channels__.

_You become your own video distribution channel!_

* __Join us in [Slack](http://slack.oddnetworks.com/).__ We'd love to see your beaming face.
* Say hello on [Twitter](https://twitter.com/OddNetworks).
* Submit an [issue](https://github.com/oddnetworks/oddworks/issues).
* Check out the [API sample responses](https://www.oddnetworks.com/documentation/oddworks/).

> The Oddworks Content Server is currently under the microscope in an internal security audit before being made available in this repository. We're planning for a release inside a week - (March 3 - 10, 2016).

### Platform
The Oddworks Platform consists of two main concepts:

1. The __Oddworks Content Server__ which maintains a database of your content and provides it to your apps via a strictly specified [JSON API](http://jsonapi.org/).
2. The __Oddworks Device SDKs__ which are designed to consume the content from the Oddworks Content Server as well as report usage data back to it.

### Content Server
The Oddworks Content Server is made up of several loosely coupled components:

* [seneca-odd-catalog](https://github.com/oddnetworks/seneca-odd-catalog) To handle general get, create, and update operations on your published content.
* [seneca-odd-auth](https://github.com/oddnetworks/seneca-odd-auth) Used to compartmentalize the device linking and authentication logic.
* [seneca-odd-identity](https://github.com/oddnetworks/seneca-odd-identity) Provides get, create, and update operations for identity and authentication resources.
* [seneca-odd-views](https://github.com/oddnetworks/seneca-odd-views) A flexible module for building and caching structured views for your apps.
* [odd-schemas](https://github.com/oddnetworks/odd-schemas) Used to type check incoming data entities.
* __Oddworks__ Content Server (you are here)

All of these components are automatically installed as dependencies when you setup the Oddworks Content Server. Oddworks uses [NPM](https://www.npmjs.com/) for dependency and package management (see [Technology](#technology) below).

The Oddworks Content Server is currently under the microscope in an internal security audit before being made available in this repository. We're planning for a release inside a week - (March 3 - 10, 2016).

### TV Connected and Mobile Device SDKs
The Oddworks SDKs are developed and used in production, but require auditing before we make them publicly available. We expect them to be ready in a week(ish) - (March 3 - 10, 2016).

* Android SDK - Used for mobile, tablet, Android TV, and Fire TV. Check out the [docs](http://android.guide.oddnetworks.com/) now.
* iOS SDK - Used for iPhone, iPad, and Apple TV. Check out the [docs](http://apple.guide.oddnetworks.com/) now.

With plans for (several weeks later):

* Roku SDK
* JavaScript SDK for use in [Windows Universal](https://msdn.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide) and web applications.

### Multiscreen Apps
In addition to the SDKs there are plans to have open source apps which leverage the SDKs available to you as well. You could use these as reference implementations, a hobby project, or make some tweaks and ship your own streaming channel!

Although the source repositories are not open source yet there are some [downloads available now](https://www.oddnetworks.com/documentation/sampleapps/) from the website.

What's planned?

* Apple TV app
* Android mobile app
* iPhone app
* Roku TV app
* What would you like to have?

### Technology
The Oddworks Platform is written for the [Node.js](https://nodejs.org/) runtime, and uses the well known [Express.js](http://expressjs.com/) framework for HTTP communication.

Oddworks is designed to be database agnostic so long as the underlying database can support JSON document storage, including some RDMSs like PostgreSQL. Currently the only supported and tested database is MongoDB.

Although communication between the devices and the REST API is typically done in a synchronous way, the inner guts of the system is designed to communicate via asynchronous message passing. This makes it easier to extend the platform with plugins and other loosely coupled modules without worrying about upstream changes like you would in tightly coupled platforms.

### Battle Tested
The Oddworks Platform is born from an experienced team battle hardened in the trenches of video gaming. The concept began to take shape during work with [Major League Gaming](http://www.majorleaguegaming.com/), [Riot Games](http://www.riotgames.com/),
and [Warner Brothers / Turbine Games](http://www.turbine.com/). Today, the Oddworks Platform is used by:

* [Poker Central](https://www.pokercentral.com/)
* [Professional Bull Riders: Live](http://www.pbr.com/)
* [ITPro TV](https://itpro.tv/)

### Motivation
The Oddworks Platform was designed and developed by [Odd Networks](https://www.oddnetworks.com/) to lower the barrier for developers and content owners to create your own streaming content network. Based on our experience in video gaming we thought that TV could use a big improvement. We believe in the future of television and, with the Oddworks open source platform, we hope you'll make that future a reality.

We proudly stand behind our open source work and, in addition to maintaining the Oddworks project, Odd Networks also provides hosted services, a Pro Dashboard, a Live Stream Generator, and a Recommendation Service.

Check out [www.oddnetworks.com](https://www.oddnetworks.com/)

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)

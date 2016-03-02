![Odd Networks](http://oddnetworks.co/assets/images/hero-odd-logo.png)

Oddworks is an open source video distribution platform built to destroy the barriers to streaming television. Use it to:

* Stream your video content to TV connected devices like Apple TV and Roku.
* Proxy, cache, and bend the space time continuum between your content management system and existing online video platform (Vimeo, YouTube, Ooyala, Brightcove).
* Aggregate usage metrics from your video apps to expand viewership and create custom viewing experiences.
* Distribute content from multiple sources out to your social channels.

You become your own video distribution channel!

The Oddworks Platform consists of two main components:

1. The __Oddworks Content Server__ which maintains a database of your content and provides it to your apps via a strictly specified [JSON API](http://jsonapi.org/).
2. The __Oddworks Device SDKs__ which are designed to consume the content from the Oddworks Content Server as well as report usage data back to it.

### Content Server
The Oddworks Content Server is made up of several loosely coupled components:

* [seneca-odd-catalog](https://github.com/oddnetworks/seneca-odd-catalog)
* [seneca-odd-auth](https://github.com/oddnetworks/seneca-odd-auth)
* [seneca-odd-views](https://github.com/oddnetworks/seneca-odd-views)
* [odd-schemas](https://github.com/oddnetworks/odd-schemas)
* [seneca-odd-identity](https://github.com/oddnetworks/seneca-odd-identity)
* __Oddworks__ Content Server (you are here)

The Oddworks Content Server is still currently under an internal security audit before being made available in this repository, but will be available inside a week - (March 3 - 10, 2016).

### TV Connected and Mobile Devices
Of course there will be open source TV and mobile device SDKs available as well. These are developed and in use, but require auditing before we make them publicly available. We expect them to be ready in a week(ish) - (March 3 - 10, 2016).

* Android SDK - Used for mobile, tablet, Android TV, and Fire TV.
* iOS SDK - Used for iPhone, iPad, and Apple TV.

And plans for:

* Roku SDK
* JavaScript SDK for use in [Windows Universal](https://msdn.microsoft.com/en-us/windows/uwp/get-started/universal-application-platform-guide) and web applications.

### Multiscreen Apps
In addition to the SDKs there are plans to have open source apps available to you as well. You could use these as reference implementations, a hobby project, or make some tweaks and ship your own streaming channel!

What's planned?

* Apple TV app
* Android mobile app
* iPhone app
* Roku TV app
* What would you like to have?

### Example
Example response from the Oddworks Content Server to be consumed by the Android SDK:

    curl https://you.oddworks.io/v2/videos/34b6ac82e396c4d2c3b8a9404e5e10ba

```JSON
{
    "data": {
        "type": "video",
        "meta": {
            "source": "itunes"
        },
        "relationships": {
            "related": {
                "data": [
                    {
                        "id": "a55bee77c722f1fe7600b7ec88fb7eba",
                        "type": "video"
                    },
                    {
                        "id": "4bad3548d72d880339b9587fcb0310a5",
                        "type": "video"
                    },
                    {
                        "id": "abc5ccc28c903c514b3a2890d2443aad",
                        "type": "video"
                    }
                ]
            }
        },
        "id": "34b6ac82e396c4d2c3b8a9404e5e10ba",
        "links": {
            "self": "https://you.oddworks.io/v2/videos/34b6ac82e396c4d2c3b8a9404e5e10ba"
        },
        "attributes": {
            "title": "This Week @ NASA, January 8, 2016",
            "description": "NASA astronomical findings highlighted, Next space station crew preparing for mission and more ...",
            "images": {
                "aspect16x9": "https://spaceholder.cc/1920x1080"
            },
            "url": "http://www.nasa.gov/sites/default/files/atoms/video/twan0108_h264.mp4",
            "duration": 60619511,
            "organization": "nasa",
            "ads": {
                "enabled": false,
                "assetId": "34b6ac82e396c4d2c3b8a9404e5e10ba"
            },
            "overlays": {},
            "player": {
                "type": "brightcove"
            },
            "sharing": {
                "enabled": true,
                "text": "Check out \"This Week @ NASA, January 8, 2016\" on NASA TV"
            }
        }
    },
    "meta": {
        "device": "GOOGLE_ANDROID",
        "queryParams": {},
        "userEntitlements": []
    },
    "links": {
        "self": "https://you.oddworks.io/v2/videos/34b6ac82e396c4d2c3b8a9404e5e10ba"
    }
}
```

### Technology
The Oddworks Platform is written for the [Node.js](https://nodejs.org/) runtime, and uses the well known [Express.js](http://expressjs.com/) framework for HTTP communication.

Oddworks is designed to be database agnostic so long as the underlying database can support JSON document storage, including some RDMSs like PostgreSQL. Currently the only supported and tested database is MongoDB.

Although communication between the devices and the REST API is typically done in a synchronous way, the inner guts of the system is designed to communicate via asynchronous message passing. This makes it easier to extend the platform with plugins and other loosely coupled modules without worrying about upstream changes like in tightly coupled platforms.

### Battle Tested
Oddworks is used by

* [Poker Central](https://www.pokercentral.com/)
* [Professional Bull Riders: Live](http://www.pbr.com/)
* [ITPro TV](https://itpro.tv/)

### Motivation
The Oddworks Platform was designed and developed by [Odd Networks](https://www.oddnetworks.com/) to lower the barrier for developers and content owners to create your own streaming content network. We believe in the future of television and, with the Oddworks open source platform, we hope you'll make that future a reality.

We proudly stand behind our open source work and, in addition to maintaining the Oddworks project, Odd Networks also provides hosted services, a Pro Dashboard, a Live Stream Generator, and a Recommendation Service.

Check out [www.oddnetworks.com](https://www.oddnetworks.com/)

License
-------
Apache 2.0 © [Odd Networks](http://oddnetworks.com)

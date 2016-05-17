# Logger

The Oddworks Logger is a singleton instance of the [winston](https://www.npmjs.com/package/winston) logging library.

## Logging

You may use `oddworks.logger` anywhere in your application.

    oddworks.logger.info(`It's better than bad! It's good!`);

Read more about [winston - logging](https://github.com/winstonjs/winston#logging)

## Transports

By default, we use `winston.transports.Console` and the `info` level.

This can be overridden at any time using the `.configure` function like so:

    oddworks.logger.configure({
      transports: [
        yourTransport,
        yourOtherTransport
      ]
    })

Winston has quite the array of transports to choose from and is very extensible.

Read more about [winston - transports](https://github.com/winstonjs/winston/blob/master/docs/transports.md)

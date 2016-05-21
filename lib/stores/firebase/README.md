# Firebase Store

In order to use the Firebase Store, you will need a Firebase instance.

Head to the [Firebase Console](https://console.firebase.google.com/) to create an instance.

You will also need a Service Account. Head to the Google Identity Platform documentation for [Creating a service account](https://developers.google.com/identity/protocols/OAuth2ServiceAccount#overview)

## Initialization

**Options**

- `types` - array of resource types that the store is responsible for working with
- `firebase` - object containing authentication information for your Firebase instance
    - `databaseURL` - ex. `"https://databaseName.firebaseio.com"`
    - `serviceAccount` - ex. `"path/to/serviceAccountCredentials.json"`

### Example Initialization

    const oddworks = require('oddworks');
    const oddcast = require('oddcast');

    // FIREBASE_ACCOUNT_CREDENTIALS="path/to/serviceAccountCredentials.json"
    const FIREBASE_ACCOUNT_CREDENTIALS = process.env.FIREBASE_ACCOUNT_CREDENTIALS;

    oddworks.stores.firebase.initialize(oddcast.bus, {
      types: ['video', 'collection'],
      firebaseAuth: {
        databaseURL: 'https://databaseName.firebaseio.com',
        serviceAccount: FIREBASE_ACCOUNT_CREDENTIALS
      }
    });

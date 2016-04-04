require('dotenv').config({silent: true});

const deepFreeze = require('deep-freeze');
const URI = require('urijs');
const pjson = require('./package.json');
const env = process.env.NODE_ENV;
const hostname = process.env.DOMAIN;
const protocol = process.env.PROTOCOL;
const port = env === 'test' ? null : process.env.PORT;
const mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/device';
const redisURL = process.env.REDIS_URI || 'redis://localhost:6379';
const redisURI = new URI(redisURL);
const elasticSearchHost = process.env.ELASTICSEARCH_URI || process.env.FOUNDELASTICSEARCH_URL || process.env.SEARCHBOX_URL || 'localhost:9200';
const elasticSearchCreds = process.env.AWS_ES_CREDS ? process.env.AWS_ES_CREDS.split(':') : new Array(2);
const elasticSearchRegion = process.env.AWS_DEFAULT_REGION;

const uri = new URI();
uri.protocol(protocol);
uri.hostname(hostname);
if (env === 'development') {
	uri.port(port);
}

module.exports = deepFreeze({
	// generic options
	'strict': {
		add: false,
		// allow cache to return non-objects/arrays
		result: false
	},
	'opbeat': {
		appId: process.env.OPBEAT_APP_ID,
		networkId: process.env.OPBEAT_network_ID,
		secretToken: process.env.OPBEAT_SECRET_TOKEN,
		logLevel: process.env.OPBEAT_LOG_LEVEL || 'info',
		active: (env === 'production' || env === 'staging'),
		instrument: true,
		hostname: ('odd-device-api-' + env)
	},
	'env': env,
	'main': {
		version: pjson.version,
		public: '/public',
		host: hostname,
		port: port,
		protocol: protocol,
		baseURL: uri.toString()
	},
	'mongo-store': {
		uri: mongoUri,
		options: {
			db: {
				w: 1
			},
			server: {
				poolSize: 10
			}
		}
	},
	'redis-cache': {
		redis: {
			host: redisURI.hostname(),
			port: redisURI.port(),
			auth_pass: redisURI.password() // eslint-disable-line
		}
	},
	'events': {
		redisUri: redisURL,
		// 8 hours
		cleanupInterval: (8 * 60 * 60 * 1000),
		// converts milliseconds into seconds (for now)
		timeMultiplier: 1000
	},
	'device-auth': {
		userCodeExpiresIn: 1800,
		accessTokenRequestInterval: 5
	},
	'elasticsearch': {
		minSockets: 11,
		maxSockets: 100,
		keepAlive: (env !== 'test'),
		host: elasticSearchHost,
		apiVersion: '1.5',
		index: 'catalog',
		log: ((env === 'stage' || env === 'staging' || env === 'development') ? 'debug' : 'error'),
		region: elasticSearchRegion,
		creds: {
			secretAccessKey: elasticSearchCreds[1],
			accessKeyId: elasticSearchCreds[0]
		}
	},
	'secrets': {
		accessTokenSharedSecret: process.env.JWT_SHARED_SECRET || 'testing'
	}
});

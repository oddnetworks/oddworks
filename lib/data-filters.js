'use strict';

var deviceConstants = require('./device-constants');
var amazonAndroid = require('./data-filters/amazon-android');
var amazonAndroidTV = require('./data-filters/amazon-android-tv');
var amazonFireTV = require('./data-filters/amazon-firetv');
var microsoftXbox360 = require('./data-filters/microsoft-xbox360');
var microsoftXboxOne = require('./data-filters/microsoft-xboxone');
var rokuRoku = require('./data-filters/roku-roku');
var appleIOS = require('./data-filters/apple-ios');
var appleTV = require('./data-filters/apple-tv');
var googleAndroid = require('./data-filters/google-android');
var googleAndroidTv = require('./data-filters/google-android-tv');
var dataFilters = {};

dataFilters[deviceConstants.AMAZON_FIRETV] = amazonFireTV;
dataFilters[deviceConstants.AMAZON_ANDROID] = amazonAndroid;
dataFilters[deviceConstants.AMAZON_ANDROID_TV] = amazonAndroidTV;
dataFilters[deviceConstants.MICROSOFT_XBOX360] = microsoftXbox360;
dataFilters[deviceConstants.MICROSOFT_XBOXONE] = microsoftXboxOne;
dataFilters[deviceConstants.ROKU_ROKU] = rokuRoku;
dataFilters[deviceConstants.APPLE_IOS] = appleIOS;
dataFilters[deviceConstants.APPLE_TV] = appleTV;
dataFilters[deviceConstants.GOOGLE_ANDROID] = googleAndroid;
dataFilters[deviceConstants.GOOGLE_ANDROID_TV] = googleAndroidTv;

module.exports = dataFilters;

/* global jasmine */

const failFast = require('jasmine-fail-fast');

jasmine.getEnv().addReporter(failFast.init());

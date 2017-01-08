const assert = require('assert');
const eh = require('./error_handling');
const run_tests = require('./run_tests');


var testCases = {};

testCases.test_error_handler = function() {
	eh.error_handler("hello world");
	eh.error_handler(null);
};


run_tests.run(process.argv, testCases);


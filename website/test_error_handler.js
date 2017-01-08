const assert = require('assert');
const eh = require('./error_handling');

const test_error_handler = function() {
	eh.error_handler("hello world");
	eh.error_handler(null);
};


test_error_handler();


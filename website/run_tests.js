var exports = module.exports = {};


exports.run = function(args, testCases) {
	if (args.length >= 3) {
		for (var i = 2; i < args.length; i++) {
			var curArg = args[i];

			if (curArg in testCases) {
				testCases[curArg]();
			} else {
				console.log('could not find in testCase curArg:  ' + curArg);
			}
		}
	} else {
		for (var tc in testCases) {
			testCases[tc]();
		}
	}
};


const assert = require('assert');
const mb = require('./measurement_buffer');
const run_tests = require('./run_tests');


const testFileDbPath = "test_measurement_buffer.sqlite3"

var testCases = {};


testCases.testReadBuildScripts = function() {
	console.log('test_measurement_buffer testReadBuildScripts');
	var r = mb.readBuildScripts('../database', mb.buildScriptFiles);
	assert(r.length > 0)
	console.log('r.length:  ' + r.length);
	console.log('r[0].substring(0,100):  ' + r[0].substring(0,100));
};


testCases.testBuildMemoryDb = function() {
	console.log('test_measurement_buffer testBuildMemoryDb');

	var buildScripts = mb.readBuildScripts('../database', mb.buildScriptFiles);

	var db = mb.buildMemoryDb(buildScripts);

	console.log('test by querying device table');

	db.all('select * from measurements', function(err, rows) {
		assert(rows.length == 0);
		console.log('measurements table exists and is empty as expected');
	});
};


testCases.testBuildMemoryDbFromPath = function () {
	var db = mb.buildMemoryDbFromPath('../database');

	db.all('select count(*) N from measurements', function(err, rows) {
		assert(rows[0].N == 0);
	});
};


testCases.testPopulateMeasurements = function () {
	console.log('test_measurement_buffer testPopulateMemoryDb');

	var buildScripts = mb.readBuildScripts('../database', mb.buildScriptFiles);
	var db = mb.buildMemoryDb(buildScripts);

	var N = 100;

	mb.populateMeasurements(db, testFileDbPath, N, function() {
		db.all('select * from measurements', function(err, rows) {
			var count = rows.length;
			console.log('test_measurement_buffer testPopulateMemoryDb count:  ' + count);
			assert(count >= N);

			console.log('test_measurement_buffer testPopulateMemoryDb rows[0]:  ' + JSON.stringify(rows[0]));
		});
	});
};


testCases.testBuildAndPopulateBuffer = function() {
	console.log('test_measurement_buffer testBuildAndPopulateBuffer');
	var N = 100;
	mb.buildAndPopulateBuffer('../database', testFileDbPath, N, function(db) {
		db.all('select * from measurements', function(err, rows) {
			var count = rows.length;
			console.log('test_measurement_buffer testBuildAndPopulateBuffer count:  ' + count);
			assert(count >= N);

			console.log('test_measurement_buffer testBuildAndPopulateBuffer rows[0]:  ' + JSON.stringify(rows[0]));
		});
	});
};


run_tests.run(process.argv, testCases);

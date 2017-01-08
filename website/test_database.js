const assert = require('assert');
const db = require('./database');
const sqlite3 = require('sqlite3').verbose();
const measurementBuffer = require('./measurement_buffer');
const run_tests = require('./run_tests');


const testFileDbPath = "test_database.sqlite3"

var testCases = {};

const testDb =  new sqlite3.Database(testFileDbPath);


testCases.testGetDeviceMetadata = function() {
	console.log('tests_database testGetDeviceMetadata');

	db.getDeviceMetadata(testDb, function(r) {
		for (var deviceId in r) {
			var curDevice = r[deviceId];
			console.log('curDevice:  ' + JSON.stringify(curDevice));
			assert(deviceId == curDevice.id);
		}

		var numDevices = Object.keys(r).length;
		assert(numDevices > 0);
		console.log('numDevices:  ' + numDevices);
	});
};

testCases.testGetRecentTemperatureData = function() {
	console.log('test_database testGetRecentTemperatureData');

	db.getRecentTemperatureData(1000, testDb, 30, function(data) {
		assert('deviceMetadata' in data);
		assert('data' in data);
//		console.log('data:  ' + JSON.stringify(data));
		var dMetadata = data['deviceMetadata'];
		var numDevices = Object.keys(dMetadata).length;
		assert(numDevices > 0);
		console.log('numDevices:  ' + numDevices);

		var mData = data['data'];
		assert(mData.length > 0);
		console.log('mData.length:  ' + mData.length);
		console.log('mData:  ' + JSON.stringify(mData));
	});
};


testCases.testSaveData = function() {
	console.log('test_database testSaveData');

	var fileDb = measurementBuffer.buildMemoryDbFromPath('../database');
	var memDb = measurementBuffer.buildMemoryDbFromPath('../database');

	var formData = {deviceId:'my_fake_device', readTimes:[0,1,2], temperaturesF:[3,5,7], lightLevels:[11,13,17], hardwareVoltages:[19,23,29]};

	db.saveData(formData, fileDb, memDb, function() {
		setTimeout(function() {
			fileDb.all('select count(*) N from measurements', function(err, rows) {
				var N = rows[0].N;
				console.log('N:  ' + N);
				assert(N == 9);
			});

			fileDb.all('select * from measurements where time=0 and measurement_type_id=1', function(err, rows) {
				console.log('rows.length:  ' + rows.length);
				assert(rows.length == 1);
				var r = rows[0];
				console.log('first entry for temperature r:  ' + JSON.stringify(r));
				assert(r.device_id == 'my_fake_device');
				assert(r.value == 3.0);
			});

			fileDb.all('select * from measurements where time=1 and measurement_type_id=2', function(err, rows) {
				console.log('rows.length:  ' + rows.length);
				assert(rows.length == 1);
				var r = rows[0];
				console.log('first entry for temperature r:  ' + JSON.stringify(r));
				assert(r.device_id == 'my_fake_device');
				assert(r.value == 13.0);
			});
			
			fileDb.all('select * from measurements where time=2 and measurement_type_id=3', function(err, rows) {
				console.log('rows.length:  ' + rows.length);
				assert(rows.length == 1);
				var r = rows[0];
				console.log('first entry for temperature r:  ' + JSON.stringify(r));
				assert(r.device_id == 'my_fake_device');
				assert(r.value == 29.0);
			});
			//test running without callback
			db.saveData(formData, fileDb, memDb);

		}, 100);
	});
};


run_tests.run(process.argv, testCases);


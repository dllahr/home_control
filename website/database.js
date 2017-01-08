const sqlite3 = require('sqlite3').verbose();
const error_handling = require('./error_handling');


var exports = module.exports = {};

const recentMeasurementsQuery = 'select device_id, time, value from measurements where measurement_type_id=1 and time%? = 0 and id > ?';

const insertStmtStr = 'insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values (?, ?, ?, ?, ?)';

const deviceMetadataQuery = 'select d.*, dt.name device_type_name, dt.description as device_type_description from device d join device_type dt on dt.id = d.device_type_id';


exports.getDeviceMetadata = function(db, callback) {
	db.all(deviceMetadataQuery, function(err, deviceRows) {
		console.log('data requested, getting device metadata');
		var deviceMetadata = {};
		for (var i = 0; i < deviceRows.length; i++) {
			var curDevice = deviceRows[i];
			deviceMetadata[curDevice.id] = curDevice;
		}

		callback(deviceMetadata);
	});
};


exports.getRecentTemperatureData = function(numRecentEntries, db, timeStep, callback) {
	exports.getDeviceMetadata(db, function(deviceMetadata) {

		console.log('getting max id from measurements table');
		db.all('select max(id) max_id from measurements', function(err, rows) {
			var startId = rows[0].max_id - numRecentEntries;

			console.log('retrieving rows from measurements table');
			db.all(recentMeasurementsQuery, timeStep, startId, function(err, dataRows) {
				if (err) {
					error_handling.error_handler(err);
				} else {
					console.log('measurements retrieved from database, sending response');
					var data = {'deviceMetadata':deviceMetadata, 'data':dataRows};

					callback(data);
				}
			});
		});
	});
};


exports.saveData = function(formData, db, memDb, callback) {
	var deviceId = formData.deviceId;

	var numEntries = formData.readTimes.length;

	var now = new Date();
	console.log('data received from deviceId:  ' + deviceId + ' at now:  ' + now);

	var stmt = db.prepare(insertStmtStr);
	var memStmt = memDb.prepare(insertStmtStr);
	
	for (var i = 0; i < numEntries; i++) {
		var t = formData.readTimes[i];

		var TF = formData.temperaturesF[i];
		stmt.run(deviceId, t, 1, TF, 1, error_handling.error_handler);
		memStmt.run(deviceId, t, 1, TF, 1, error_handling.error_handler);
		
		var ll = formData.lightLevels[i];
		stmt.run(deviceId, t, 2, ll, 2, error_handling.error_handler);

		var hwv = formData.hardwareVoltages[i];
		stmt.run(deviceId, t, 3, hwv, 3, error_handling.error_handler);
	}
	stmt.finalize();
	memStmt.finalize();

	memDb.all('select min(id) min_id from measurements', function(err, rows) {
		var minId = rows[0].min_id;

		var maxDeleteId = minId + numEntries;
		
		memDb.run('delete from measurements where id < ?', maxDeleteId);
	});

	if ('thermostatOnOff' in formData && formData['thermostatOnOff'] != null) {
		var mostRecentTime = formData.readTimes.slice(-1)[0];
		var value = formData.thermostatOnOff;
		console.log('adding thermostatOnOff entry value:  ' + value + ' typeof(value):  ' + typeof(value));
		db.run(insertStmtStr, deviceId, mostRecentTime, 4, value, 4);
		memDb.run(insertStmtStr, deviceId, mostRecentTime, 4, value, 4);
	}

	if (callback != 'undefined' && callback != null) {
		callback();
	}
};


const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const measurementBuffer = require('./measurement_buffer');


var fileDbPath = '/media/raid/dllahr/projects/temperatureMonitoring/measurements.sqlite3';

query = 'select device_id, time, value from measurements where measurement_type_id=1 and time%60 = 0 and id > ?';

var insertStmtStr = 'insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values (?, ?, ?, ?, ?)';

const deviceMetadataQuery = 'select d.*, dt.name device_type_name, dt.description as device_type_description from device d join device_type dt on dt.id = d.device_type_id';


var my_err_handler = function(err) {
	if (err) {
		console.log(err);
	}
};


var db = new sqlite3.Database(fileDbPath);


measurementBuffer.buildAndPopulateBuffer('/home/lahr/code/home_control/database', fileDbPath, 500000, function(memDb) {
	http.createServer(function (request, response) {
		if (request.method == 'GET') {

			memDb.all(deviceMetadataQuery, function(err, deviceRows) {
				console.log('data requested, getting device metadata');
				var deviceMetadata = {};
				for (var i = 0; i < deviceRows.length; i++) {
					var curDevice = deviceRows[i];
					deviceMetadata[curDevice.id] = curDevice;
				}

				console.log('getting min and max ids from measurements table');
				memDb.all('select min(id) min_id, max(id) max_id from measurements', function(err, rows) {
					var startId = 0.75*(rows[0].max_id - rows[0].min_id) + rows[0].min_id;

					console.log('retrieving rows from measurements table');
					memDb.all(query, startId, function(err, dataRows) {
						if (err) {
							my_err_handler(err);
						} else {
							console.log('measurements retrieved from database, sending response');
							var data = {"deviceMetadata":deviceMetadata, "data":dataRows};
							response.writeHead(200, {'Content-Type':'application/json'});
							response.end(JSON.stringify(data), function() {console.log('finished sending measurements data');});
						}
					});
				});
			});

		} else if (request.method == 'POST') {
			var requestBody = '';
			request.on('data', function(data) {
				requestBody += data;
			});

			request.on('end', function() {

				var formData = JSON.parse(requestBody);
				var deviceId = formData.deviceId;

				var numEntries = formData.readTimes.length;

				var now = new Date();
				console.log('data received from deviceId:  ' + deviceId + ' at now:  ' + now);

				var stmt = db.prepare(insertStmtStr);
				var memStmt = memDb.prepare(insertStmtStr);
				
				for (var i = 0; i < numEntries; i++) {
					var t = formData.readTimes[i];

					var TF = formData.temperaturesF[i];
					stmt.run(deviceId, t, 1, TF, 1, my_err_handler);
					memStmt.run(deviceId, t, 1, TF, 1, my_err_handler);
					
					var ll = formData.lightLevels[i];
					stmt.run(deviceId, t, 2, ll, 2, my_err_handler);

					var hwv = formData.hardwareVoltages[i];
					stmt.run(deviceId, t, 3, hwv, 3, my_err_handler);
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
			});
		}
	}).listen(8124);
	
	console.log('Server running at http://127.0.0.1:8124/');
});


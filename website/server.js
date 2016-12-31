const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const measurementBuffer = require('./measurement_buffer');


var fileDbPath = '/media/raid/dllahr/projects/temperatureMonitoring/measurements.sqlite3';


//This query returns the temperature data (measurement_type_id=1) for 
//the most recently recorded week (1 week = 604800 s, 3 devices, 3 measurements = approximately 5443200 entries)
//at 10 minute intervals
var query = 'select device_id, time, value from measurements '
query += ' where id > (select max(id)-5443200 from measurements) '
query += ' and measurement_type_id=1 and time%10 = 0';

var insertStmtStr = 'insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values (?, ?, ?, ?, ?)';

const deviceMetadataQuery = 'select d.*, dt.name device_type_name, dt.description as device_type_description from device d join device_type dt on dt.id = d.device_type_id';


var my_err_handler = function(err) {
	if (err) {
		console.log(err);
	}
};


var db = new sqlite3.Database(fileDbPath);


measurementBuffer.buildAndPopulateBuffer('/home/lahr/code/home_control/database', fileDbPath, 10000, function(memDb) {
	http.createServer(function (request, response) {
		if (request.method == 'GET') {
			response.writeHead(200, {'Content-Type':'application/json'});

			memDb.all(deviceMetadataQuery, function(err, deviceRows) {
				var deviceMetadata = {};
				for (var i = 0; i < deviceRows.length; i++) {
					var curDevice = deviceRows[i];
					deviceMetadata[curDevice.id] = curDevice;
				}

				memDb.all(query, function(err, dataRows) {
					if (err) {
						my_err_handler(err);
					} else {
						var data = {"deviceMetadata":deviceMetadata, "data":dataRows};
						response.end(JSON.stringify(data));
					}
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
					memStmt.run(deviceId, t, 2, ll, 2, my_err_handler);

					var hwv = formData.hardwareVoltages[i];
					stmt.run(deviceId, t, 3, hwv, 3, my_err_handler);
					memStmt.run(deviceId, t, 3, hwv, 3, my_err_handler);
				}
				stmt.finalize();
				memStmt.finalize();

				memDb.all('select min(id) min_id from measurements', function(err, rows) {
					var minId = rows[0].min_id;

					var maxDeleteId = minId + 3*numEntries;
					
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


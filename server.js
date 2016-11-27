var http = require('http');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('/media/raid/dllahr/projects/temperatureMonitoring/measurements.sqlite3');

//This query returns the temperature data (measurement_type_id=1) for 
//the most recently recorded week (1 week = 604800 s, 3 devices, 3 measurements = approximately 5443200 entries)
//at 10 minute intervals
var query = 'select device_id, time, value from measurements '
query += ' where id > (select max(id)-5443200 from measurements) '
query += ' and measurement_type_id=1 and time%600 = 0';

var insertStmtStr = 'insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values (?, ?, ?, ?, ?)';

var my_err_handler = function(err) {
	if (err) {
		console.log(err);
	}
};


http.createServer(function (request, response) {
	if (request.method == 'GET') {
//		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.writeHead(200, {'Content-Type':'application/json'});

		db.all(query, function(err, rows) {
			if (err) {
				my_err_handler(err);
			} else {
				/*var body = '';
				for (var i = 0; i < rows.length; i++) {
					body += rows[i].device_id + '\t' + rows[i].time + '\t' + rows[i].value + '\n';
				}
				response.end('Hello the Alka Bear and Beary the Polar Bear\n' + body);*/
				response.end(JSON.stringify(rows));
			}
		});

	} else if (request.method == 'POST') {
		var requestBody = '';
		request.on('data', function(data) {
			requestBody += data;
		});

		request.on('end', function() {

			var formData = JSON.parse(requestBody);
			var deviceId = formData.deviceId;

			var now = new Date();
			console.log('data received from deviceId:  ' + deviceId + ' at now:  ' + now);

			var stmt = db.prepare(insertStmtStr);
			
			for (var i = 0; i < formData.readTimes.length; i++) {
				var t = formData.readTimes[i];

				var TF = formData.temperaturesF[i];
				stmt.run(deviceId, t, 1, TF, 1, my_err_handler);
				
				var ll = formData.lightLevels[i];
				stmt.run(deviceId, t, 2, ll, 2, my_err_handler);

				var hwv = formData.hardwareVoltages[i];
				stmt.run(deviceId, t, 3, hwv, 3, my_err_handler);
			}
			stmt.finalize();

			if ('thermostatOnOff' in formData && formData['thermostatOnOff'] != null) {
				var mostRecentTime = formData.readTimes.slice(-1)[0];
				var value = formData.thermostatOnOff;
				console.log('adding thermostatOnOff entry value:  ' + value + ' typeof(value):  ' + typeof(value));
				db.run(insertStmtStr, deviceId, mostRecentTime, 4, value, 4);
			}
		});
	}
}).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');


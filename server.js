var http = require('http');
var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('/media/raid/dllahr/projects/temperatureMonitoring/measurements.sqlite3');

http.createServer(function (request, response) {
	if (request.method == "GET") {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('Hello the Alka Bear and Beary the Polar Bear\n');
	} else if (request.method == "POST") {
		var requestBody = '';
		request.on('data', function(data) {
			requestBody += data;
		});

		request.on('end', function() {
			var formData = JSON.parse(requestBody);
			var now = new Date();
			console.log('data received from formData.deviceId:  ' + formData.deviceId + ' at now:  ' + now);

			var stmt = db.prepare('insert into measurements (device_id, time, measurement_type_id, value, measurement_unit_id) values (?, ?, ?, ?, ?)');
			
			for (var i = 0; i < formData.readTimes.length; i++) {
				var t = formData.readTimes[i];

				var TF = formData.temperaturesF[i];
				stmt.run(formData.deviceId, t, 1, TF, 1);
				
				var ll = formData.lightLevels[i];
				stmt.run(formData.deviceId, t, 2, ll, 2);

				var hwv = formData.hardwareVoltages[i];
				stmt.run(formData.deviceId, t, 3, hwv, 3);
			}
			stmt.finalize();
		});
	}
}).listen(8124);

console.log('Server running at http://127.0.0.1:8124/');


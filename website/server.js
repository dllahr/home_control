const http = require('http');
const measurementBuffer = require('./measurement_buffer');
const database = require('./database');
const error_handling = require('./error_handling');
const sqlite3 = require('sqlite3').verbose();
const alerts = require('./alerts');
const update_electric_imp = require('./update_electric_imp');
const config = require('config');
const fs = require('fs');


const staticFilepaths = ['index.html', 'home_control.js', 'test_home_control.js',
	'test_home_control.html'];

const serverPort = config.get('server').port;

const dbConfig = config.get('database');

const memoryBufferConfig = config.get('memoryBuffer');

const alertsConfig = config.get('alerts');

const db = new sqlite3.Database(dbConfig.fileDbPath);

const electricImpConfig = config.get('electricImp');

const minimumTemperatureSetPoint = config.get('minimumTemperatureSetPoint');


//Series of callbacks to setup things needed by the server, then the server is started
//First, build and populates the in memory measurement data
measurementBuffer.buildAndPopulateBuffer(dbConfig.databaseCodeDirectory, dbConfig.fileDbPath,
	memoryBufferConfig.bufferSize, function(memDb) {

	//Second, setup the alert monitoring
	alerts.buildInitialAlertInfo(db, function(alertInfo) {
		setTimeout(function() {
			alerts.alertLoop(alertInfo, alertsConfig, alerts.sendAlert, alerts.checkForAlerts,
				alertsConfig.sleepTime, 0);
		}, alertsConfig.initialDelay);

		//third, load static files
		const staticFiles = {};
		for (var i = 0; i < staticFilepaths.length; i++) {
			const path = staticFilepaths[i];
			staticFiles[path] = fs.readFileSync(path);
		}
		staticFiles[''] = staticFiles['index.html'];

		//finally, start the server
		http.createServer(function (request, response) {
			if (request.method == 'GET') {
				if ('/recentData' == request.url) {
					database.getRecentTemperatureData(dbConfig.recentQuery.numEntries, db, memDb,
						dbConfig.recentQuery.timeStep, function(data) {

						response.writeHead(200, {'Content-Type':'application/json'});
						response.end(JSON.stringify(data), function() {
							console.log('finished sending measurements data');
						});
					});
				} else {
					const relUrl = request.url.substring(1);
					if (relUrl in staticFiles) {
						var contentType = 'text/html';
						if (relUrl.substring(relUrl.length-2) == 'js') {
							contentType = 'application/javascript';
						}
						response.writeHead(200, {'Content-Type':contentType});
						response.end(staticFiles[relUrl]);
					} else {
						response.writeHead(404, {'Content-Type':'text/html'});
						response.end('Sorry, we couldn\'t find that address:  ' + request.url);
					}
				}
			}
			else if (request.method == 'POST') {
				var requestBody = '';
				request.on('data', function(data) {
					requestBody += data;
				});

				request.on('end', function() {
					var formData = JSON.parse(requestBody);
					database.saveData(formData, db, memDb);

					alerts.updateAlertInfo(formData, alertInfo);
				});
			} else if (request.method == 'PUT') {
				update_electric_imp.validateUpdate(request, response, electricImpConfig,
					minimumTemperatureSetPoint);
			} else {
				response.writeHead(405, {'Content-Type':'text/html'});
				response.end('Sorry, we don\'t support that method:  ' + request.method);
			}
		}).listen(serverPort);

		console.log('Server running at http://127.0.0.1:' + serverPort);
	});
});

const http = require('http');
const measurementBuffer = require('./measurement_buffer');
const database = require('./database');
const error_handling = require('./error_handling');
const sqlite3 = require('sqlite3').verbose();
const alerts = require('./alerts');
const config = require('config');


const serverPort = config.get('server').port;

const dbConfig = config.get('database');

const memoryBufferConfig = config.get('memoryBuffer');

const alertsConfig = config.get('alerts');

const db = new sqlite3.Database(dbConfig.fileDbPath);


measurementBuffer.buildAndPopulateBuffer(dbConfig.databaseCodeDirectory, dbConfig.fileDbPath, memoryBufferConfig.bufferSize, function(memDb) {
	alerts.buildInitialAlertInfo(memDb, function(alertInfo) {

		setTimeout(function() {
			alerts.alertLoop(alertInfo, alertsConfig, alerts.sendAlert, alerts.checkForAlerts, alertsConfig.sleepTime);
		}, alertsConfig.initialDelay);

		http.createServer(function (request, response) {
			if (request.method == 'GET') {
				database.getRecentTemperatureData(dbConfig.recentQuery.numEntries, memDb, dbConfig.recentQuery.timeStep, function(data) {
					response.writeHead(200, {'Content-Type':'application/json'});
					response.end(JSON.stringify(data), function() {
						console.log('finished sending measurements data');
					});
				});
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
			}
		}).listen(serverPort);
		
		console.log('Server running at http://127.0.0.1:' + serverPort);
	});
});


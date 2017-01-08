const http = require('http');
const measurementBuffer = require('./measurement_buffer');
const database = require('./database');
const error_handling = require('./error_handling');
const sqlite3 = require('sqlite3').verbose();


const serverPort = 8124;
const databaseCodeDirectory = '/home/lahr/code/home_control/database';
const fileDbPath = '/media/raid/dllahr/projects/temperatureMonitoring/measurements.sqlite3';
const bufferSize = 500000;
const numRecentEntries = 125000;
const timeStep = 60;


const db = new sqlite3.Database(fileDbPath);

measurementBuffer.buildAndPopulateBuffer(databaseCodeDirectory, fileDbPath, bufferSize, function(memDb) {
	http.createServer(function (request, response) {
		if (request.method == 'GET') {
			database.getRecentTemperatureData(numRecentEntries, memDb, timeStep, function(data) {
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
			});
		}
	}).listen(serverPort);
	
	console.log('Server running at http://127.0.0.1:' + serverPort);
});


const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

var exports = module.exports = {};

exports.buildScriptFiles = ['create_tables.sql', 'add_devices.sql', 'update001_add_device_information.sql']

exports.readBuildScripts = function(scriptDirectoryPath, buildScriptFiles) {
	var buildScripts = [];
	for (var i = 0; i < buildScriptFiles.length; i++) {
		var bsf = buildScriptFiles[i];

		var bsf_path = scriptDirectoryPath + '/' + bsf;

		var curBs = fs.readFileSync(bsf_path, 'utf8');

		buildScripts.push(curBs);
	}
	console.log("measurement_buffer readBuildScripts finished reading buildScripts - buildScripts.length:  " + buildScripts.length);
	return buildScripts;
}

exports.buildMemoryDb = function(buildScripts) {
	var db = new sqlite3.Database(':memory:');

	for (var i = 0; i < buildScripts.length; i++) {
		var bs = buildScripts[i];

		db.exec(bs);
	}

	return db;
};


var insertStmtStr = 'insert into measurements (id, device_id, time, measurement_type_id, value, measurement_unit_id) values (?, ?, ?, ?, ?, ?)';

exports.populateMeasurements = function(memDb, fileDbPath, numMeasurements, callback) {
	var db = new sqlite3.Database(fileDbPath)

	console.log('measurement_buffer populateMeasurements starting query of fileDb');
	db.all('select max(id) max_id from measurements', function(err, rows) {
		console.log('measurement_buffer populateMeasurements finished query of fileDb');

		var maxId = rows[0].max_id;
		//we (currently) make 3 measurements - temperature, light level, hardware voltage - to get the actual number of temperature measurements,
		//there will be 3 times as many actual entries, so multiply by 3
		var startId = maxId - numMeasurements*3;

		db.all('select * from measurements where id > ? and measurement_type_id in (1,4)', startId, function(err, rows) {
			var stmt = memDb.prepare(insertStmtStr);

			console.log('measurement_buffer populateMeasurements running statements');
			for (var i = 0; i < rows.length; i++) {
				var row = rows[i];
//				console.log(JSON.stringify(row));
				stmt.run(row.id, row.device_id, row.time, row.measurement_type_id, row.value, row.measurement_unit_id);

				if (i%10000 == 0) {
					console.log('measurement_buffer populateMeasurements running statements progress i:  ' + i);
				}
			}

			console.log('measurement_buffer populateMeasurements executing finalize');
			stmt.finalize(callback);
		});
	});

	db.close();
};


exports.buildAndPopulateBuffer = function(dbScriptsDirectoryPath, fileDbPath, numMeasurements, callback) {
	var buildScripts = exports.readBuildScripts(dbScriptsDirectoryPath, exports.buildScriptFiles);

	var db = exports.buildMemoryDb(buildScripts);

	exports.populateMeasurements(db, fileDbPath, numMeasurements, function() {
		console.log('measurement_buffer buildAndPopulateBuffer buffer preparation complete, calling callback');
		callback(db);
	});
};


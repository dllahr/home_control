const alerts = require('./alerts');
const assert = require('assert');
const run_tests = require('./run_tests');
const sqlite3 = require('sqlite3').verbose();
const config = require('config');


var testCases = {};

const testFileDbPath = "test_alerts.sqlite3"

const testDb =  new sqlite3.Database(testFileDbPath);


testCases.testBuildInitialAlertInfo = function() {
	console.log('test_alerts testBuildInitialAlertInfo');
	
	alerts.buildInitialAlertInfo(testDb, function(alertInfo) {
		var N = Object.keys(alertInfo).length;
		console.log('N:  ' + N);
		assert(N > 0);

		for (var id in alertInfo) {
			var curDevice = alertInfo[id];
			console.log('curDevice:  ' + JSON.stringify(curDevice));

			assert('lastTime' in curDevice);
			assert('lastTemperature' in curDevice);

			if (curDevice.device_type_id in alerts.thermostatDeviceTypeIds) {
				assert('thermostatInfo' in curDevice);
				var ti = curDevice.thermostatInfo;
				assert('onOff' in ti);
				assert('temperatureAtOnReport' in ti);
			}
			console.log();
		}
	});
};


testCases.testUpdateAlertInfo = function() {
	console.log('test_alerts testUpdateAlertInfo');

	var alertInfo = {myFakeDevice:{id:'myFakeDevice', lastTime:0, lastTemperature:1}};
	var formData = {deviceId:'myFakeDevice', readTimes:[1,2], temperaturesF:[3,5]};
	console.log('formData:  ' + JSON.stringify(formData));
	console.log();

	//happy path non-thermostat
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path non-thermostat - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(2 == alertInfo.myFakeDevice.lastTime);
	assert(5 == alertInfo.myFakeDevice.lastTemperature);
	console.log();

	//happy path thermostat device but no thermostat info in formData
	alertInfo.myFakeDevice.lastTime = 0;
	alertInfo.myFakeDevice.lastTemperature = 1;
	alertInfo.myFakeDevice['thermostatInfo'] = {onOff:false, temperatureAtOnReport:null};
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path thermostat but no thermostat info in formData - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(2 == alertInfo.myFakeDevice.lastTime);
	assert(5 == alertInfo.myFakeDevice.lastTemperature);
	assert(false == alertInfo.myFakeDevice.thermostatInfo.onOff);
	assert(null == alertInfo.myFakeDevice.thermostatInfo.temperatureAtOnReport);
	console.log();

	//happy path thermostat device but thermostat info in formData is null
	alertInfo.myFakeDevice.lastTime = 0;
	alertInfo.myFakeDevice.lastTemperature = 1;
	formData['thermostatOnOff'] = null;
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path thermostat but thermostat info in formData is null - formData:  ' + JSON.stringify(formData));
	console.log('happy path thermostat but thermostat info in formData is null - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(2 == alertInfo.myFakeDevice.lastTime);
	assert(5 == alertInfo.myFakeDevice.lastTemperature);
	assert(false == alertInfo.myFakeDevice.thermostatInfo.onOff);
	assert(null == alertInfo.myFakeDevice.thermostatInfo.temperatureAtOnReport);
	console.log();

	//happy path thermostat device thermostat info indicates on
	alertInfo.myFakeDevice.lastTime = 0;
	alertInfo.myFakeDevice.lastTemperature = 1;
	formData.thermostatOnOff = true;
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path thermostat, thermostat info indicates on - formData:  ' + JSON.stringify(formData));
	console.log('happy path thermostat, thermostat info indicates on - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(2 == alertInfo.myFakeDevice.lastTime);
	assert(5 == alertInfo.myFakeDevice.lastTemperature);
	assert(true == alertInfo.myFakeDevice.thermostatInfo.onOff);
	assert(5 == alertInfo.myFakeDevice.thermostatInfo.temperatureAtOnReport);
	console.log();

	//happy path thermostat device thermostat info indicates on, later time
	alertInfo.myFakeDevice.lastTime = 0;
	alertInfo.myFakeDevice.lastTemperature = 1;
	formData.thermostatOnOff = true;
	formData.readTimes[1] = 7;
	formData.temperaturesF[1] = 11;
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path thermostat, thermostat info indicates on, later time - formData:  ' + JSON.stringify(formData));
	console.log('happy path thermostat, thermostat info indicates on, later time - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(7 == alertInfo.myFakeDevice.lastTime);
	assert(11 == alertInfo.myFakeDevice.lastTemperature);
	assert(true == alertInfo.myFakeDevice.thermostatInfo.onOff);
	assert(5 == alertInfo.myFakeDevice.thermostatInfo.temperatureAtOnReport);
	console.log();

	//happy path thermostat device thermostat info indicates off, later time
	alertInfo.myFakeDevice.lastTime = 0;
	alertInfo.myFakeDevice.lastTemperature = 1;
	formData.thermostatOnOff = false;
	formData.readTimes[1] = 13;
	formData.temperaturesF[1] = 17;
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path thermostat, thermostat info indicates off, later time - formData:  ' + JSON.stringify(formData));
	console.log('happy path thermostat, thermostat info indicates off, later time - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(13 == alertInfo.myFakeDevice.lastTime);
	assert(17 == alertInfo.myFakeDevice.lastTemperature);
	assert(false == alertInfo.myFakeDevice.thermostatInfo.onOff);
	assert(null == alertInfo.myFakeDevice.thermostatInfo.temperatureAtOnReport);
	console.log();
};


testCases.testSendAlert = function() {
	console.log('test_alerts testSendAlert');
	var alertConfig = config.get('alerts');
	alerts.sendAlert(alertConfig.gmailUsername, alertConfig.gmailPassword, alertConfig.emailAddresses,
		'test message from node - this is subject', 'test message from node - this is the body<br/><b>Hi bear hi!</b>');
	console.log();
};


testCases.testCheckForNoCommunication = function() {
	console.log('test_alerts testCheckForNoCommunication');

	var alertConfig = {lastTimeOffset: 100};

	var now = (new Date()).getTime() / 1000;
	var deviceAlertInfo = {lastTime:now};
	var r = alerts.checkForNoCommunication(deviceAlertInfo, alertConfig);
	console.log('no lack of communication alert expected - r:  ' + r);
	assert(null == r);
	console.log();

	deviceAlertInfo.lastTime = now - 200;
	r = alerts.checkForNoCommunication(deviceAlertInfo, alertConfig);
	console.log('expect to issue alert that no communication has occurred message:  ' + JSON.stringify(r));
	assert(null != r);
	assert('subject' in r);
	assert('message' in r);
	console.log();
};


testCases.testCheckForTemperatureAlert = function() {
	console.log('test_alerts testCheckForTemperatureAlert');

	console.log('no alert settings therefore no check performed');
	var r = alerts.checkForTemperatureAlert({});
	console.log('no temperature alert expected - r:  ' + r);
	assert(null == r);
	console.log();

	console.log('alert settings present and temperature above threshold and less than comparison');
	var deviceAlertInfo = {lastTemperature:50.0, alertSettings:[{comparison:'<',
		treshold:38.0}]};
	r = alerts.checkForTemperatureAlert(deviceAlertInfo);
	console.log('no temperature alert expected - r:  ' + r);
	assert(null == r);
	console.log();

	console.log('alert settings present and temperature above threshold and less than comparison');
	deviceAlertInfo.alertSettings = [{comparison:">", treshold:70.0}];
	r = alerts.checkForTemperatureAlert(deviceAlertInfo);
	console.log('no temperature alert expected - r:  ' + r);
	assert(null == r);
	console.log();

	console.log('alert settings present but unrecognized comparison');
	deviceAlertInfo.alertSettings[0].comparison = "hello world";
	r = alerts.checkForTemperatureAlert(deviceAlertInfo);
	console.log('temperature alert expected - r:  ' + JSON.stringify(r));
	assert(null != r);
	assert('message' in r);
	assert(r.message.search('unrecognized comparison') != -1);
	console.log();

	console.log('alert settings present and alert condition is true');
	deviceAlertInfo = {lastTemperature:30.0, lastTime:10000000,
		alertSettings:[{comparison:'<', threshold:38.0}]};
	r = alerts.checkForTemperatureAlert(deviceAlertInfo);
	console.log('low temperature alert expected - r:  ' + JSON.stringify(r));
	assert(null != r);
	assert('subject' in r);
	assert('message' in r);
	assert(r.message.search('temperature alert measured') != -1);
	console.log();
};


testCases.testCheckForAlerts = function() {
	console.log('test_alerts testCheckForAlerts');

	var alertRecords = [];
	var sendAlertsFunction = function(gmailUsername, gmailPassword, alertEmailAddresses, subject, message) {
		alertRecords.push([subject, message]);
	};

	var alertsConfig = {lastTimeOffset: 1000, enableEmail: true};

	var now = (new Date()).getTime() / 1000;
	var alertInfo = {myFakeDevice:{
		id:'myFakeDevice',
		lastTime:now,
		lastTemperature:50,
		alertSettings:[{comparison:'<', threshold:40.0}]}
	};

	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('no message expected - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 0);
	console.log();

	alertInfo.myFakeDevice.lastTime = 1000;
	alertInfo.myFakeDevice.otherMetadata = 'here\'s some other metadata';
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('1 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);
	console.log();

	alertRecords = [];
	alertInfo.myFakeDevice.lastTemperature = 30;
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('2 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);
	console.log();

	alertRecords = [];
	alertInfo.myFakeDevice2 = {id:'myFakeDevice2', lastTime:now, lastTemperature:50};
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('2 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);
	console.log();

	alertRecords = [];
	alertInfo.myFakeDevice2.lastTime = 222222;
	alertInfo.myFakeDevice2.otherMetadata = 'this is the metadata for the second device';
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('2 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);
	console.log();
};


testCases.testAlertLoop = function() {
	console.log('test_alerts testAlertLoop');

	var checksFunction = function() {
		console.log('function called');
	};

	alerts.alertLoop({numLoopIterations:3}, null, null, checksFunction, 100);
};

run_tests.run(process.argv, testCases);

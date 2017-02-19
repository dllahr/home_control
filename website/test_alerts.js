const alerts = require('./alerts');
const assert = require('assert');
const run_tests = require('./run_tests');
const sqlite3 = require('sqlite3').verbose();
const config = require('config');


var testCases = {};

const testFileDbPath = "test_alerts.sqlite3"

const testDb =  new sqlite3.Database(testFileDbPath);


testCases.testBuildInitialAlertInfo = function() {
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
		}
	});
};


testCases.testUpdateAlertInfo = function() {
	var alertInfo = {myFakeDevice:{id:'myFakeDevice', lastTime:0, lastTemperature:1}};
	var formData = {deviceId:'myFakeDevice', readTimes:[1,2], temperaturesF:[3,5]};
	console.log('formData:  ' + JSON.stringify(formData));

	//happy path non-thermostat
	alerts.updateAlertInfo(formData, alertInfo);
	console.log('happy path non-thermostat - alertInfo:  ' + JSON.stringify(alertInfo));
	assert(2 == alertInfo.myFakeDevice.lastTime);
	assert(5 == alertInfo.myFakeDevice.lastTemperature);

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
};


testCases.testSendAlert = function() {
	var alertConfig = config.get('alerts');
	alerts.sendAlert(alertConfig.gmailUsername, alertConfig.gmailPassword, alertConfig.emailAddresses,
		'test message from node - this is subject', 'test message from node - this is the body<br/><b>Hi bear hi!</b>');
};


testCases.testCheckForNoCommunication = function() {
	console.log('test_alerts testCheckForNoCommunication');

	var alertConfig = {lastTimeOffset: 100};

	var now = (new Date()).getTime() / 1000;
	var deviceAlertInfo = {lastTime:now};
	var r = alerts.checkForNoCommunication(deviceAlertInfo, alertConfig);
	console.log('no lack of communication alert expected - r:  ' + r);
	assert(null == r);

	deviceAlertInfo.lastTime = now - 200;
	r = alerts.checkForNoCommunication(deviceAlertInfo, alertConfig);
	console.log('expect to issue alert that no communication has occurred message:  ' + JSON.stringify(r));
	assert(null != r);
	assert('subject' in r);
	assert('message' in r);
};


testCases.testCheckForLowTemperature = function() {
	console.log('test_alerts testCheckForLowTemperature');

	var alertConfig = {minTemperature:40};

	var deviceAlertInfo = {lastTime:1000000000, lastTemperature:50};
	var r = alerts.checkForLowTemperature(deviceAlertInfo, alertConfig);
	console.log('no low temperature expected - r:  ' + r);
	assert(null == r);

	deviceAlertInfo.lastTemperature = 30;
	r = alerts.checkForLowTemperature(deviceAlertInfo, alertConfig);
	console.log('low temperature alert expected - r:  ' + JSON.stringify(r));
	assert(null != r);
	assert('subject' in r);
	assert('message' in r);
};


testCases.testCheckForAlerts = function() {
	console.log('test_alerts testCheckForAlerts');

	var alertRecords = [];
	var sendAlertsFunction = function(gmailUsername, gmailPassword, alertEmailAddresses, subject, message) {
		alertRecords.push([subject, message]);
	};

	var alertsConfig = {lastTimeOffset: 1000, minTemperature: 40, enableEmail: true};

	var now = (new Date()).getTime() / 1000;
	var alertInfo = {myFakeDevice:{id:'myFakeDevice', lastTime:now, lastTemperature:50}};

	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('no message expected - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 0);

	alertInfo.myFakeDevice.lastTime = 1000;
	alertInfo.myFakeDevice.otherMetadata = 'here\'s some other metadata';
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('1 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);

	alertRecords = [];
	alertInfo.myFakeDevice.lastTemperature = 30;
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('2 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);

	alertRecords = [];
	alertInfo.myFakeDevice2 = {id:'myFakeDevice2', lastTime:now, lastTemperature:50};
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('2 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);

	alertRecords = [];
	alertInfo.myFakeDevice2.lastTime = 222222;
	alertInfo.myFakeDevice2.otherMetadata = 'this is the metadata for the second device';
	alerts.checkForAlerts(alertInfo, sendAlertsFunction, alertsConfig);
	console.log('2 message expected - no communication - alertRecords:  ' + JSON.stringify(alertRecords));
	assert(alertRecords.length == 1);
};


testCases.testAlertLoop = function() {
	console.log('test_alerts testAlertLoop');

	var checksFunction = function() {
		console.log('function called');
	};

	alerts.alertLoop({numLoopIterations:3}, null, null, checksFunction, 100);
};

run_tests.run(process.argv, testCases);

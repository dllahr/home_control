const database = require('./database');
const nodemailer = require('nodemailer');
const config = require('config');


var exports = module.exports = {};

const alertEmailAddresses = 'dllahr@gmail.com, ams471@mail.harvard.edu';  //lahr@localhost

exports.thermostatDeviceTypeIds = {2:null, 3:null};


const consoleLogAlertInfo = function(alertInfo) {
	console.log('alerts consoleLogAlertInfo');
	for (id in alertInfo) {
		console.log('id:  ' + id + '  alertInfo[id]:  ' + JSON.stringify(alertInfo[id]));
	}
};


//typically called with:
//alertInfo as object that is built with buildInitialAlertInfo and then updated with updateAlertInfo
//alertsConfig loaded from config file, alerts section
//sendAlertFunction as sendAlerts function in this module
//checksFunction as checkForAlerts function in this module
//sleepTime in milliseconds
//
exports.alertLoop = function(alertInfo, alertsConfig, sendAlertFunction, checksFunction, sleepTime) {
	console.log('alerts alertLoop');
	consoleLogAlertInfo(alertInfo);

	if (!('loopIndex' in alertInfo)) {
		alertInfo.loopIndex = 0;
	}
	console.log('alertInfo.loopIndex:  ' + alertInfo.loopIndex);

	checksFunction(alertInfo, sendAlertFunction, alertsConfig);

	//this if check is for testing purposes so the function can be called without
	//going into the infinite loop
	if (!('numLoopIterations' in alertInfo) || alertInfo.loopIndex < alertInfo.numLoopIterations) {
		alertInfo.loopIndex++;

		setTimeout(function() {
			exports.alertLoop(alertInfo, alertsConfig, sendAlertFunction, checksFunction, sleepTime);
		},
		sleepTime);
	}
};


exports.buildInitialAlertInfo = function(db, callback) {
	database.getDeviceMetadata(db, function(deviceMetadata) {
		database.getAlertSettings(db, function(alertSettings) {
			for (var id in deviceMetadata) {
				var curDevice = deviceMetadata[id];
				curDevice.lastTime = null;
				curDevice.lastTemperature = null;

				if (id in alertSettings) {
					curDevice.alertSettings = alertSettings[id];
				}

				if (curDevice.device_type_id in exports.thermostatDeviceTypeIds) {
					curDevice.thermostatInfo = {onOff:false, temperatureAtOnReport:null};
				}
			}

			callback(deviceMetadata);
		});
	});
};


exports.updateAlertInfo = function(formData, alertInfo) {
	var id = formData.deviceId;
	var curDevice = alertInfo[id];

	var N = formData.readTimes.length;

	curDevice.lastTime = formData.readTimes[N - 1];
	curDevice.lastTemperature = formData.temperaturesF[N - 1];

	if ('thermostatInfo' in curDevice && 'thermostatOnOff' in formData && formData.thermostatOnOff != null) {
		var ti = curDevice.thermostatInfo;

		if (ti.onOff == false && formData.thermostatOnOff == true) {
			ti.temperatureAtOnReport = curDevice.lastTemperature;
		} else if (ti.onOff == true && formData.thermostatOnOff == false) {
			ti.temperatureAtOnReport = null;
		}

		ti.onOff = formData.thermostatOnOff;
	}
};


exports.sendAlert = function(gmailUsername, gmailPassword, alertEmailAddresses, subject, message) {
	console.log('alerts sendAlert');

	var url = 'smtps://' + gmailUsername + '%40gmail.com:' + gmailPassword + '@smtp.gmail.com';
//	console.log('url:  ' + url);

	var transporter = nodemailer.createTransport(url);

	var mailOptions = {from: '"home control alerts" <home.control@raspberryPiB>',
		to: alertEmailAddresses,
		'subject': subject,
		html: message
	};
	console.log('mailOptions:  ' + JSON.stringify(mailOptions));

	transporter.sendMail(mailOptions, function(error, info){
		if(error) {
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});
};


exports.checkForNoCommunication = function(deviceAlertInfo, alertsConfig) {
	console.log('alerts checkForNoCommunication');

	var nowDate = new Date();
	var nowS = nowDate.getTime() / 1000; //current timestamp in seconds
	console.log('nowS:  ' + nowS);

	var expectedLastTimeGt = nowS - alertsConfig.lastTimeOffset;
	console.log('expectedLastTimeGt:  ' + expectedLastTimeGt);

	if (expectedLastTimeGt > deviceAlertInfo.lastTime) {
		var expectedLastTimeGtDate = new Date(1000 * expectedLastTimeGt);
		var lastTimeDate = new Date(1000 * deviceAlertInfo.lastTime);

		var msg = 'no communication from device<br/>';
		msg += 'time checked:  ' + nowDate + '<br/>';
		msg += 'expected time that device should have communicated by:  ' + expectedLastTimeGtDate + '<br/>';
		msg += 'last time that device communicated:  ' + lastTimeDate + '<br/>';
		msg += 'time checked (epoch, s):  ' + nowS + '<br/>';
		msg += 'window of time to wait for(s):  ' + alertsConfig.lastTimeOffset + '<br/>';
		msg += 'expected time that device should have communicated by(epoch, s):  ' + expectedLastTimeGt + '<br/>';
		return {subject:'no communication', message:msg};
	} else {
		return null;
	}
};


exports.checkForTemperatureAlert = function(deviceAlertInfo) {
	console.log('alerts checkForTemperatureAlert');
	console.log('deviceAlertInfo:  ' + JSON.stringify(deviceAlertInfo));
	
	var msg = '';
	if ('alertSettings' in deviceAlertInfo) {
		var alertSettings = deviceAlertInfo.alertSettings;
		console.log('checking for alert(s) using found alertSettings:  ' + JSON.stringify(alertSettings));

		for (var i = 0; i < alertSettings.length; i++) {
			var threshold = alertSettings[i].threshold;
			var comparison = alertSettings[i].comparison;

			var isAlerted = false;
			if ('<' == comparison) {
				isAlerted = deviceAlertInfo.lastTemperature < threshold;
			} else if ('>' == comparison) {
				isAlerted = deviceAlertInfo.lastTemperature > threshold;
			} else {
				msg += 'unrecognized comparison in alert settings - deviceAlertInfo:  ';
				msg += JSON.stringify(deviceAlertInfo) + '<br/>';
			}

			if (true == isAlerted) {
				msg += 'temperature alert measured<br/>';
				msg += 'measured temperature(F):  ' + deviceAlertInfo.lastTemperature + '<br/>';
				msg += 'temperature threshold(F):  ' + threshold + '<br/>';
				msg += 'comparison:  ' + comparison + '<br/>';
				msg += 'time:  ' + (new Date(deviceAlertInfo.lastTime*1000)) + '<br/>';
				msg += 'time (epoch, s):  ' + deviceAlertInfo.lastTime + '<br/>';
			}
		}
	}

	if (msg != '') {
		return {subject:'temperature alert(s) measured', message:msg};
	} else {
		return null;
	}
};


//typicallys called with
//alertInfo as object that is built with buildInitialAlertInfo and then updated with updateAlertInfo
//alertsConfig loaded from config file, alerts section
//sendAlertFunction as sendAlerts function in this module
exports.checkForAlerts = function(alertInfo, sendAlertFunction, alertsConfig) {
	console.log('alerts checkForAlerts');
	consoleLogAlertInfo(alertInfo);

	if (sendAlertFunction == 'undefined' || sendAlertFunction == null) {
		sendAlertFunction = exports.SendAlert;
	}

	var alertFunctions = [exports.checkForNoCommunication, exports.checkForTemperatureAlert];
	var alerts = [];
	for (var id in alertInfo) {
		var deviceAlertInfo = alertInfo[id];
		console.log('checking all alerts for id:  ' + id + '  deviceAlertInfo:  ' + JSON.stringify(deviceAlertInfo));

		for (var i = 0; i < alertFunctions.length; i++) {
			var aFun = alertFunctions[i];

			var r = aFun(deviceAlertInfo, alertsConfig);

			if (r != null) {
				r.deviceAlertInfo = deviceAlertInfo;
				alerts.push(r);
			}
		}

		console.log('finished checking for id:  ' + id);
		console.log();
	}

	if (alerts.length > 0) {
		var subject = null;
		var message = null;
		if (alerts.length == 1) {
			subject = alerts[0].subject;
			message = alerts[0].message;
			message += JSON.stringify(alerts[0].deviceAlertInfo);
		} else {
			subject = 'multiple alerts detected';

			var message = '';
			for (var i = 0; i < alerts.length; i++) {
				var curAlert = alerts[i];
				message += 'subject:  ' + curAlert.subject + '<br/>';
				message += curAlert.message;
				message += JSON.stringify(curAlert.deviceAlertInfo) + '<br/>';
				message += '<br/>';
			}
		}

		if (true == alertsConfig.enableEmail) {
			sendAlertFunction(alertsConfig.gmailUsername, alertsConfig.gmailPassword, alertsConfig.emailAddresses, subject, message);
		}
	}
};

const https = require('https');


var exports = module.exports = {};


exports.validate = function(setTempData, electricImpConfig, minimumTemperatureSetPoint) {
    var msg = '';

    if (! (setTempData.device in electricImpConfig)) {
        msg = msg + 'Device to set temperature for not recognized - setTempData.device:  ' +
            setTempData.device + '\n';
    }

    for (var i = 1; i < setTempData.times.length; i++) {
        const curTime = setTempData.times[i];
        const prevTime = setTempData.times[i-1];

        if (curTime <= prevTime) {
            msg = msg + 'Hello super bear!  All times must be increasing - this entry is less than or equal to its predecessor:  row ' +
            (i+1) + '\n';
        }
    }

    for (var i = 0; i < setTempData.temperatures.length; i++) {
        const curTempStr = setTempData.temperatures[i];
        const curTemp = parseFloat(curTempStr);

        if (isNaN(curTemp)) {
            msg = msg + 'The temperature in row ' + (i+1) + ' is not a number:  ' + curTempStr;
        } else if (curTemp < minimumTemperatureSetPoint) {
            msg = msg + 'That\'s too cold super bear!  This entry is less than the minimum temperature (' +
                minimumTemperatureSetPoint + '):  row ' + (i+1) + '\n';
        } else {
            setTempData.temperatures[i] = curTemp;
        }
    }

    return msg;
};


exports.validateUpdate = function(request, response, electricImpConfig,
        minimumTemperatureSetPoint) {
    console.log('update_electric_imp validateUpdate electricImpConfig:');
    console.log(electricImpConfig);

    var requestBody = '';
    request.on('data', function(data) {
        requestBody += data;
    });

    request.on('end', function() {
        console.log('requestBody:');
        console.log(requestBody);

        var setTempData = JSON.parse(requestBody);

        const errorMsg = exports.validate(setTempData, electricImpConfig, minimumTemperatureSetPoint);
        if (errorMsg != '') {
            response.writeHead(200);
            response.end(JSON.stringify({'errorMsg':errorMsg}));
        }

        const path = electricImpConfig[setTempData.device].path;

        const electricImpRequestOptions = {
            hostname:  electricImpConfig._common.hostname,
            'path':  path,
            method:  'PUT',
            headers: {
                'user-key':  electricImpConfig._common.userKey,
                'Content-Type':  'application/json'
            }
        };
        console.log('electricImpRequestOptions:');
        console.log(electricImpRequestOptions);

        const electricImpRequest = https.request(electricImpRequestOptions, function(eimpResp) {
            var eimpRawData = '';
            eimpResp.on('data', function(chunk) {
                eimpRawData = eimpRawData + chunk;
            });

            eimpResp.on('end', function() {
                const eimpData = JSON.parse(eimpRawData);
                console.log('eimpData:');
                console.log(eimpData);

                response.writeHead(200);
                response.end(JSON.stringify({
                    allGood:'reading you loud and clear Alka',
                    'eimpData':  eimpData
                }));
            });
        });

        electricImpRequest.on('error', function(err) {
            response.writeHead(200);
            response.end(JSON.stringify({
                'errorMsg':('error occurred when trying to contact electric imp: ' + err)
            }));
        });

        delete setTempData.device;
        electricImpRequest.write(JSON.stringify(setTempData));
        electricImpRequest.end();
    });
};


$HomeControl = (function(window) {
    var my = window['$HomeControl'] || {};

    return my;
})(window);


$HomeControl.endOfDaySeconds = 86401;
$HomeControl.minimumTemperature = 40;


$HomeControl.convertTimeToSeconds = function(timeStr) {
    const amPmStr = timeStr.substring(timeStr.length-2);
    var amPm = 0;
    if ('pm' == amPmStr) {
        amPm = 12;
    }

    const split = timeStr.substring(0, timeStr.length-2).split(":");
    const hoursStr = split[0];
    const minutesStr = split[1];

    var hours = Number.parseInt(hoursStr);
    if (12 == hours) {
        hours = 0;
    }
    hours = hours + amPm;

    const minutes = Number.parseInt(minutesStr);

    const seconds = 3600*hours + 60*minutes;

    return seconds;
};


const buildDeviceToDataMap = function(serverData) {
    var deviceMetadata = serverData['deviceMetadata'];
    console.log(deviceMetadata);

    var deviceMap = {};
    for (var i = 0; i < serverData['data'].length; i++) {
        var r = serverData['data'][i];
        var deviceId = r["device_id"];

        if (!(deviceId in deviceMap)) {
            var curDeviceMetadata = deviceMetadata[deviceId];

            var legendName = curDeviceMetadata['location'] + ' ' + curDeviceMetadata['device_type_name'];

            deviceMap[deviceId] = {x:[], y:[], mode:"markers", type:"scatter", name:legendName};
        }

        var deviceData = deviceMap[deviceId];
        var myDate = new Date(r["time"]*1000);
        deviceData["x"].push(myDate);
        deviceData["y"].push(r["value"]);
    }

    return deviceMap;
};


const buildLatestTemperaturesTableHtml = function(deviceMap) {
    var deviceIds = Object.keys(deviceMap);
    deviceIds.sort();

    var tableHtml ='<table class="table table-striped table-hover">';
    tableHtml += '<tr><th>Latest Temperature (F)</th><th>Location</th><th>Latest Time</th></tr>';
    for (var i = 0; i < deviceIds.length; i++) {
        var di = deviceIds[i];
        var curData = deviceMap[di];

        var lastIndex = curData.x.length - 1;
        var latestTime = curData.x[lastIndex];
        var latestTemperature = curData.y[lastIndex];
        var rowHtml = '<tr>';
        rowHtml += '<td>' + latestTemperature + '</td>';
        rowHtml += '<td>' + curData.name + '</td>';
        rowHtml += '<td>' + latestTime + '</td>';
        rowHtml += '</tr>';
        tableHtml += rowHtml;
    }
    tableHtml += '</table>';

    return tableHtml;
};


const buildPlotlyData = function(deviceMap) {
    var deviceIds = Object.keys(deviceMap);
    deviceIds.sort();

    var data = [];
    for (var i = 0; i < deviceIds.length; i++) {
        var di = deviceIds[i];
        var curData = deviceMap[di];
        data.push(curData);
    }

    return data;
};


const buildSetTemperaturesTable = function() {
    console.log('buildSetTemperaturesTable');

    const div = $("#setTemperaturesDiv");

    const thermostats = ['downstairs', 'master bedroom'];
    const periodEnds = ["10:00am", "10:00pm", "12:00am"];
    const defaultTemperature = 42;

    div.append('<h3>Set temperature programs</h3>');

    for (var i = 0; i < thermostats.length; i++) {
        var ts = thermostats[i];
        div.append('<h4>' + ts + '</h4>\n');

        var tableHtml = '<table class="table table-striped table-hover">\n';
        tableHtml += '<tr><th>period ending (seconds)</th><th>temperature set point (F)</th></tr>\n';

        var inputIds = [];
        for (var j = 0; j < periodEnds.length; j++) {
            var pe = periodEnds[j];

            const inputIdPrefix = 'setTempDevice' + i + 'Period' + j;

            tableHtml += '<tr>\n<td>';
            const periodInputId =  inputIdPrefix + 'PeriodInput';
            tableHtml += '<input type="text" id="' + periodInputId + '" value="' + pe + '"/>';
            if (periodEnds.length-1 == j) {
                tableHtml += '(cannot adjust last time period, must be end of day)';
            }
            tableHtml += '</td>\n';

            tableHtml += '<td>';
            const tempInputId = inputIdPrefix + 'TemperatureInput';
            tableHtml += '<input type="text" id="' + tempInputId + '" value="' + defaultTemperature + '"/>';
            tableHtml += '</td>\n';

            inputIds.push([periodInputId, tempInputId]);
        }
        tableHtml += '</table>\n';
        div.append(tableHtml);

        const submitButtonId = 'submitSetTemp' + i + 'Button';
        div.append('<input type="submit" value="update ' + ts + '" id="' + submitButtonId + '" /><br/><br/>\n');
        const submitButton = $('#' + submitButtonId);

        var inputs = [];
        for (var j = 0; j < inputIds.length; j++) {
            const periodInput = $('#' + inputIds[j][0]);
            periodInput.timepicker();

            const tempInput = $('#' + inputIds[j][1]);
            inputs.push([periodInput, tempInput]);
        }

        //cannot change the time of the last input
        inputs[inputs.length-1][0].prop('disabled', true);

        submitButton.click({'inputs': inputs, 'thermostat':ts}, sendTemperatureUpdate);
    }
};


const getTimeAndTemperatureInputs = function(inputs) {
    const inputValues = {times:[], temperatures:[]};
    for (var i = 0; i < inputs.length; i++) {
        var inputPair = inputs[i];
        inputValues.times.push(inputPair[0].val());
        inputValues.temperatures.push(inputPair[1].val());
    }

    return inputValues;
};


$HomeControl.convertInputTimeStrings = function(inputTimes) {
    const timeSeconds = [];
    for (var i = 0; i < inputTimes.length-1; i++) {
        const t = $HomeControl.convertTimeToSeconds(inputTimes[i]);

        timeSeconds.push(t);
    }
    timeSeconds.push($HomeControl.endOfDaySeconds);

    return timeSeconds;
};


const sendTemperatureUpdate = function(event) {
    const inputs = event.data.inputs;

    const thermostat = event.data.thermostat;
    console.log('sendTemperatureUpdates thermostat:  ' + thermostat);

    const inputValues = getTimeAndTemperatureInputs(inputs);
    console.log('sendTemperatureUpdates inputValues:');
    console.log(inputValues);

    const timesSeconds = $HomeControl.convertInputTimeStrings(inputValues.times);
    console.log('sendTemperatureUpdates timesSeconds:');
    console.log(timesSeconds);

    var temperatures = inputValues.temperatures;

    var body = {'times': timesSeconds, 'temperatures':temperatures, device:thermostat};
    console.log('sendTemperatureUpdate body:');
    console.log(body);

    $.ajax({url:'/', method:'PUT', data:JSON.stringify(body), success: function(result) {
        console.log('message sent to node server, result: ');
        console.log(result);
        const rObj = JSON.parse(result);
        if ('errorMsg' in rObj) {
            window.alert(thermostat + ':  ' + rObj.errorMsg);
        }
    }});
};


$HomeControl.build = function() {
    var latestValuesDiv = $('#latestValuesDiv');
    latestValuesDiv.html('loading data (~5 s)');

    $('body').css('cursor', 'progress');

    $.ajax({url:'/recentData', success: function(result) {
        latestValuesDiv.html('data retrieved, formatting');

        const deviceMap = buildDeviceToDataMap(result);
        $('body').css('cursor', 'default');

        const latestTempsTableHtml = buildLatestTemperaturesTableHtml(deviceMap);
        latestValuesDiv.html(latestTempsTableHtml);

        const plotlyData = buildPlotlyData(deviceMap);
        Plotly.newPlot('myDiv', plotlyData);

        buildSetTemperaturesTable();
    }});
};

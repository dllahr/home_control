
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
    const periodEnds = [28000, 75000, 86401];
    const defaultTemperature = 42;

    var html = "<h3>Set temperature programs</h3>";
    for (var i = 0; i < thermostats.length; i++) {
        var ts = thermostats[i];
        html += '<h4>' + ts + '</h4>\n';

        html += '<table class="table table-striped table-hover">\n';
        html += '<tr><th>period ending (seconds)</th><th>temperature set point (F)</th></tr>\n';

        for (var j = 0; j < periodEnds.length; j++) {
            var pe = periodEnds[j];

            const inputIdPrefix = 'setTempDevice' + i + 'Period' + j;

            html += '<tr>\n<td>';
            const periodInputId =  inputIdPrefix + 'PeriodInput';
            html += '<input type="text" id="' + periodInputId + '" value="' + pe + '"/>';
            html += '</td>\n';

            html += '<td>';
            const tempInputId = inputIdPrefix + 'TemperatureInput';
            html += '<input type="text" id="' + tempInputId + '" value="' + defaultTemperature + '"/>';
            html += '</td>\n';
        }

        html += '</table>\n';

        html += '<input type="submit" value="update ' + ts + '"/><br/><br/>\n'
    }



    div.html(html);
};

$(document).ready(function() {
    var latestValuesDiv = $("#latestValuesDiv");
    latestValuesDiv.html("loading data (~5 s)");

    $("body").css("cursor", "progress");

    $.ajax({url:"/recentData", success: function(result) {
        latestValuesDiv.html("data retrieved, formatting");

        const deviceMap = buildDeviceToDataMap(result);
        $("body").css("cursor", "default");

        const latestTempsTableHtml = buildLatestTemperaturesTableHtml(deviceMap);
        latestValuesDiv.html(latestTempsTableHtml);

        const plotlyData = buildPlotlyData(deviceMap);
        Plotly.newPlot("myDiv", plotlyData);

        buildSetTemperaturesTable();
    }});
});

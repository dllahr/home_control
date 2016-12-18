function calcStats(data) {
    local sum = 0.0;
    local sumSq = 0.0;
    for (local i = 0; i < data.len(); i++) {
        sum += data[i];
        sumSq += data[i] * data[i];
    }

    local ave = sum / data.len();

    local result = {
        ave = ave,
        sdev = math.sqrt((sumSq / data.len()) - (ave*ave))
    };

    return result;
}

function printStats(message, stats) {
    server.log(message + " " + format("ave: %f  sdev: %f", stats.ave, stats.sdev));
}

device.on("sensor_data", function(sensor_data) {
    local hwStats = calcStats(sensor_data.hardwareVoltages);
    printStats("hwStats", hwStats);

    local lightStats = calcStats(sensor_data.lightLevels);
    printStats("lightStats", lightStats);

    local temperatureFStats = calcStats(sensor_data.temperaturesF);
    printStats("temperatureFStats", temperatureFStats);

    if (sensor_data.verboseMode) {
        server.log("Operating in verboseMode - additional information:")
        local readStats = calcStats(sensor_data.reads);
        printStats("readStats", readStats);

        local readVoltageStats = calcStats(sensor_data.readVoltages);
        printStats("readVoltageStats", readVoltageStats);

        local temperatureCStats = calcStats(sensor_data.temperaturesC);
        printStats("temperatureCStats", temperatureCStats);
    }

    local payload = {
        data = http.jsonencode(sensor_data)
    };

    local headers = { "Content-Type" : "application/json" };
    // local body = http.urlencode(payload);
    local body = http.jsonencode(sensor_data);
    local url = "http://herman.chickenkiller.com:8080/homeControl/";

    local request = http.post(url, headers, body);
    local response = request.sendsync();
    server.log("data received from device, sent to server");
});

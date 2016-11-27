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

device.on("sensor_data", function(sensor_data) {
    local hwStats = calcStats(sensor_data.hardware_voltages);
    local readStats = calcStats(sensor_data.tmp36_reads);
    local lightStats = calcStats(sensor_data.light_levels);
    server.log(format("hwStats ave: %f  sdev: %f", hwStats.ave, hwStats.sdev));
    server.log(format("readStats ave: %f  sdev: %f", readStats.ave, readStats.sdev));
    server.log(format("lightStats ave: %f  sdev: %f", lightStats.ave, lightStats.sdev));
    
    local payload = {
        data = http.jsonencode(sensor_data)
    };
    
    local headers = { "Content-Type" : "application/json" };
    // local body = http.urlencode(payload);
    local body = http.jsonencode(sensor_data);
    local url = "http://herman.chickenkiller.com:8080/temperatureMonitoring";
    
    local request = http.post(url, headers, body);
    local response = request.sendsync();
    server.log("data received from device, sent to server");
});


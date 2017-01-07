/******************************************
 * code for listening for http requests - change temperature settings, get settings
 * ****************************************/
server.log("Agent started");
server.log("Agent url:  " + http.agenturl());

local controlSettings = {"times":[25*3600], "temperatures":[45]};

function validateBody(body) {
    if ("times" in body && "temperatures" in body) {
        local l1 = body["times"].len();
        local l2 = body["temperatures"].len();

        if (l1 == l2) {
            return true;
        } else {
            server.log("invalid body data - times and temperatures data not the same length");
            return false;
        }
    } else {
        server.log("invalid body data - times and/or temperatures not present in body");
        return false;
    }
}

function httpHandler(req, resp) {
    local expectedUserKey = "CHANGE ME";
    local responseFailMessage = "epic failz";
    local apiControlPath = "/control_settings";

    server.log("****************************************");
    server.log("httpHandler called");
    server.log("req.method:  " + req.method);
    server.log("req.path:  " + req.path);
    server.log("req.query:  " + req.query);

    local headersJson = http.jsonencode(req.headers);
    server.log("req.headers:  " + headersJson);
    server.log("req.body:  " + req.body);

    if ("user-key" in req.headers) {
        local userKey = req.headers["user-key"]
        server.log("user-key found in req.headers:  " + userKey);

        if (expectedUserKey == userKey) {
            server.log("valid user-key provided");

            if (apiControlPath == req.path) {
                if ("GET" == req.method) {
                    server.log("valid get request received, sending controlSettings");
                    resp.header("Content-Type", "application/json");
                    resp.send(200, http.jsonencode(controlSettings));
                } else if ("PUT" == req.method) {
                    try {
                        local body = http.jsondecode(req.body);
                        if (validateBody(body)) {
                            server.log("valid data received in put request, updating controlSettings");
                            controlSettings["times"] = body["times"];
                            controlSettings["temperatures"] = body["temperatures"];
                            device.send("change_settings", controlSettings);
                            resp.send(200, http.jsonencode(controlSettings));
                        } else {
                            resp.send(400, responseFailMessage);
                        }
                    } catch (e) {
                        server.log("exception caught - e:  " + e);
                        server.log("body of put request was not valid JSON - req.body:  " + req.body);
                        resp.send(400, responseFailMessage);
                    }
                }
                else {
                    server.log("unsuported request method - req.method:  " + req.method);
                    resp.send(404, responseFailMessage);
                }
            } else {
                server.log("unsupported request path - req.path:  " + req.path);
                resp.send(404, responseFailMessage);
            }

        } else {
            server.log("invalid user-key provided - userKey:  " + userKey);
            resp.send(401, responseFailMessage);
        }
    } else {
        server.log("no user-key provided in headers - headersJson:  " + headersJson);
        resp.send(401, responseFailMessage);
    }
}

http.onrequest(httpHandler);


/***********************************************
 * code for receiving data from device, reporting it to API
 * *********************************************/
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
    server.log("**********************************");
    server.log("device.on sensor_data called");
    server.log("number of data points:  " + sensor_data.lightLevels.len());

    local hwStats = calcStats(sensor_data.hardwareVoltages);
    printStats("hwStats", hwStats);

    local lightStats = calcStats(sensor_data.lightLevels);
    printStats("lightStats", lightStats);

    local temperatureFStats = calcStats(sensor_data.temperaturesF);
    printStats("temperatureFStats", temperatureFStats);

    server.log("sensor_data.thermostatOnOff:  " + sensor_data.thermostatOnOff);
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
    server.log("data received from device, sent to server");
    request.sendasync(function(response) {
        server.log("data received from device, sent to server, server response:  " + response);
    });

});

device.on("request_settings", function(nothing) {
    server.log("device.on request_settings called by imp");
    device.send("change_settings", controlSettings);
});

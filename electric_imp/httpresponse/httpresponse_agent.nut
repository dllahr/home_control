server.log("Agent started");
server.log("Agent url:  " + http.agenturl());

local controlSettings = {"times":[1,2,3], "temperatures":[5,7,11]};

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
    local expectedUserKey = "AJmO60O2sCV*a5MKxT^rmSym";
    local responseFailMessage = "epic failz";
    local apiControlPath = "/control_settings";

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

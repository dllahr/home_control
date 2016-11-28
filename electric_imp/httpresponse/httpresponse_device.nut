local deviceId = hardware.getdeviceid();

server.log(format("hello from device %s", deviceId));

server.log("hello" + " world " + format("ave: %f  sdev: %f", 1.1, 3.3));

agent.on("change_settings", function(data) {
    local newTemperatures = data["temperatures"];
    server.log(newTemperatures);
    local newTimes = data["times"];
    server.log(newTimes);
});

local delayBetweenReadings = 1;
local numReadingsBetweenSends = 60;
local deviceId = hardware.getdeviceid();

server.log(format("Hello from device %s", deviceId))

// initialize pins
local tmp36 = hardware.pin9;
tmp36.configure(ANALOG_IN);

local hardwareVoltages = array(numReadingsBetweenSends);
local reads = array(numReadingsBetweenSends);
local times = array(numReadingsBetweenSends);
local lightLevels = array(numReadingsBetweenSends);

function takeReadings() {
    for (local i = 0; i < numReadingsBetweenSends; i++) {
        local hw = hardware.voltage();
        local r = tmp36.read();
        local t = time()
        local ll = hardware.lightlevel();
        
        hardwareVoltages[i] = hw;
        reads[i] = r;
        times[i] = t;
        lightLevels[i] = ll;
        
        imp.sleep(delayBetweenReadings)
    }
    
    local sensor_data = {
        device_id = deviceId,
        hardware_voltages = hardwareVoltages,
        tmp36_reads = reads,
        read_times = times,
        light_levels = lightLevels
    }
    
    agent.send("sensor_data", sensor_data)

    imp.wakeup(0, takeReadings);
}

takeReadings();


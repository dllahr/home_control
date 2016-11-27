//amount (in seconds) to substract from the devices time
//to correct for timezone and daylight savings
local timezone_dst_adjustment = 5*3600;

//time setpoints in seconds - times when the temperature setpoint
//changes
local time_setpoints = [25*3600];
    /*[7.5*3600,
    17*3600,
    21.5*3600,
    25*3600];*/
    //[10*3600, 14*3600, 25*3600];

//temperature setpoints in degrees Farenheit
local temperature_setpoints = [68];
    /*[58,
    68,
    68,
    58];*/
    //[53.6, 60.8, 68];

local seconds_per_day = 24*60*60;

local deviceId = hardware.getdeviceid();
server.log(format("Hello from device %s", deviceId))

local regulateInterval = 20*60;

//last time that a regulation check was made - a comparison between
//the measured temperature and the setpoint to decide whether to turn
//the heat on or off.  Initialize to 0 so that when the device start
//it immediately does a check
local nextRegulateTime = 0;

local on_voltage = 1.2;

local verboseMode = false;
local delayBetweenReadings = 1;
local numReadingsBetweenSends = 60;
local numRawReads = 7;

local ssr_in = hardware.pin1;
ssr_in.configure(ANALOG_OUT);

local tmp36 = hardware.pin9;
tmp36.configure(ANALOG_IN);

local hardwareVoltages = array(numReadingsBetweenSends);
local times = array(numReadingsBetweenSends);
local lightLevels = array(numReadingsBetweenSends);
local temperaturesF = array(numReadingsBetweenSends);

local readVoltages = null;
local temperaturesC = null;
if (verboseMode) {
    readVoltages = array(numReadingsBetweenSends);
    temperaturesC = array(numReadingsBetweenSends);
}

function get_temperature_setpoint() {
    local seconds = (time() - timezone_dst_adjustment) % seconds_per_day;

    local i = 0;
    while (seconds > time_setpoints[i]) {i++;}

    local T_setpoint = temperature_setpoints[i];

    server.log(format("seconds: %i  time_setpoint: %i", seconds, time_setpoints[i]))

    return T_setpoint;
}

function doRawRead() {
    local hw = array(numRawReads);
    local V = array(numRawReads);
    local t = array(numRawReads);
    local l = array(numRawReads)
    for (local i = 0; i < numRawReads; i++) {
        t[i] = time()
        l[i] = hardware.lightlevel();
        hw[i] = hardware.voltage();

        local r = tmp36.read();
        V[i] = hw[i] * r / 65536;
    }

    local medianIndex = (numRawReads - 1) / 2;
    hw.sort();
    l.sort();
    V.sort();


    local rawReadData = {
        hardwareVoltage = hw[medianIndex],
        light = l[medianIndex],
        voltage = V[medianIndex],
        time = t[medianIndex]
    };

    return rawReadData;
}

function changeThermostatSwitch(turn_on) {
    if (turn_on) {
        local hw = hardware.voltage();
        local dac_output = on_voltage / hw;
        ssr_in.write(dac_output);
    } else {
        ssr_in.write(0.0);
    }
}

function regulate_temperature(temperature) {
    local T_setpoint = get_temperature_setpoint();

    local turn_on = temperature < T_setpoint;

    changeThermostatSwitch(turn_on);

    server.log(format("temperature:  %f  T_setpoint:  %f", temperature, T_setpoint));
    server.log("turn_on: " + turn_on);
    local now = date();
    server.log(format("%i-%i-%i %i:%i:%i", now.year, now.month+1, now.day,now.hour,now.min,now.sec));

    return turn_on;
}

function takeReadingsAndRegulate() {
    for (local i = 0; i < numReadingsBetweenSends; i++) {
        local rawRead = doRawRead();

        local T_C = (104.0 * rawRead.voltage) - 54.0;
        local T_F = (1.8 * T_C) + 32.0;

        hardwareVoltages[i] = rawRead.hardwareVoltage;
        times[i] = rawRead.time;
        lightLevels[i] = rawRead.light;
        temperaturesF[i] = T_F;

        if (verboseMode) {
            readVoltages[i] = rawReadData.voltage;
            temperaturesC[i] = T_C;
        }

        imp.sleep(delayBetweenReadings)
    }

    local sensor_data = {
        deviceId = deviceId,
        hardwareVoltages = hardwareVoltages,
        readTimes = times,
        lightLevels = lightLevels,
        temperaturesF = temperaturesF,

        verboseMode = verboseMode,
        readVoltages = readVoltages,
        temperaturesC = temperaturesC,

        thermostatOnOff = null
    };

    local mostRecentTime = times.top();
    if (mostRecentTime >= nextRegulateTime) {
        nextRegulateTime = mostRecentTime + regulateInterval;

        sensor_data.thermostatOnOff = regulate_temperature(temperaturesF.top());
        server.log("sensor_data.thermostatOnOff:  " + sensor_data.thermostatOnOff);
    }

    agent.send("sensor_data", sensor_data)

    imp.onidle(takeReadingsAndRegulate);
}

takeReadingsAndRegulate();

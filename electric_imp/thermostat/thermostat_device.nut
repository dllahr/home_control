local deviceType = "SSR";  //either SSR or MOSFET

//time setpoints in seconds - times when the temperature setpoint
//changes
local timeSetpoints = [25*3600];

//temperature setpoints in degrees Farenheit
local temperatureSetpoints = [45];

agent.send("request_settings", null);

//last time that a regulation check was made - a comparison between
//the measured temperature and the setpoint to decide whether to turn
//the heat on or off.  Initialize to 0 so that when the device start
//it immediately does a check
local nextRegulateTime = 0;

/*****************************************
 * code for recieving temperature settings from agent and update local variables
 * ***************************************/
agent.on("change_settings", function(data) {
    temperatureSetpoints = data["temperatures"];
    timeSetpoints = data["times"];

    server.log("new settings received:");
    for (local i = 0; i < timeSetpoints.len(); i++) {
        server.log(format("i:  %i  timeSetpoints[i]:  %f  temperatureSetpoints[i]:  %f", i, timeSetpoints[i], temperatureSetpoints[i]));
    }

    nextRegulateTime = 0;
});


/****************************************
 * code for reporting current temperature program
 * *************************************/
agent.on("report_settings", function(nothing) {
    local control_settings = {
        timeSetpoints = timeSetpoints,
        temperatureSetpoints = temperatureSetpoints
    };
    agent.send("report_settings", control_settings);
});


//amount (in seconds) to substract from the devices time
//to correct for timezone and daylight savings
local timezone_dst_adjustment = 5*3600;

local seconds_per_day = 24*60*60;

local deviceId = hardware.getdeviceid();
server.log(format("Hello from device %s", deviceId))

local regulateInterval = 20*60;

local ssrOnVoltage = 1.2;

local verboseMode = false;
local delayBetweenReadings = 1;
local numReadingsBetweenSends = 60;
local numRawReads = 7;

////////////////////////////////////////
//configure control switch pin & function to call
local ssr_in = null;
local mosfet_gate = null;

function changeThermostatSwitchSsr(turn_on) {
    if (turn_on) {
        local hw = hardware.voltage();
        local dac_output = ssrOnVoltage / hw;
        ssr_in.write(dac_output);
    } else {
        ssr_in.write(0.0);
    }
}

function changeThermostatSwitchMosfet(turn_on) {
    if (turn_on) {
        mosfet_gate.write(1);
    } else {
        mosfet_gate.write(0);
    }
}

local changeThermostatSwitch = null;

if (deviceType == "SSR") {
    ssr_in = hardware.pin1;
    ssr_in.configure(ANALOG_OUT);

    changeThermostatSwitch = changeThermostatSwitchSsr;
} else if (deviceType == "MOSFET") {
    mosfet_gate = hardware.pin1;
    mosfet_gate.configure(DIGITAL_OUT, 0);

    changeThermostatSwitch = changeThermostatSwitchMosfet;
}
////////////////////////////////////////


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
    while (seconds > timeSetpoints[i]) {i++;}

    local T_setpoint = temperatureSetpoints[i];

    server.log(format("seconds: %i  time_setpoint: %i", seconds, timeSetpoints[i]))

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

local currentReadingIndex = 0;
local latestThermostatOnOff = null;


function doReadAndStore(i) {
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
}

function sendData() {
    local sensor_data = {
        deviceId = deviceId,
        hardwareVoltages = hardwareVoltages,
        readTimes = times,
        lightLevels = lightLevels,
        temperaturesF = temperaturesF,

        verboseMode = verboseMode,
        readVoltages = readVoltages,
        temperaturesC = temperaturesC,

        thermostatOnOff = latestThermostatOnOff
    };

    agent.send("sensor_data", sensor_data)
}

function masterLoop() {
    doReadAndStore(currentReadingIndex);
    currentReadingIndex++;

    ////////////////////////////////////////////////
    //if the time is correct, regulate the temperature
    local mostRecentTime = times.top();
    if (mostRecentTime >= nextRegulateTime) {
        nextRegulateTime = mostRecentTime + regulateInterval;

        latestThermostatOnOff = regulate_temperature(temperaturesF.top());
        server.log("latestThermostatOnOff:  " + latestThermostatOnOff);
    }
    ////////////////////////////////////////////////


    if (currentReadingIndex == numReadingsBetweenSends) {
        currentReadingIndex = 0;
        sendData();
        latestThermostatOnOff = null;
    }


    imp.wakeup(delayBetweenReadings, masterLoop);
}

masterLoop();

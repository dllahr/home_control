local verboseMode = false;
local delayBetweenReadings = 1;
local numReadingsBetweenSends = 60;
local numRawReads = 7;

local deviceId = hardware.getdeviceid();

server.log(format("Hello from device %s", deviceId));

// initialize pins
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

function takeReadings() {
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
        temperaturesC = temperaturesC
    }

    agent.send("sensor_data", sensor_data)

    imp.wakeup(0, takeReadings);
}

takeReadings();

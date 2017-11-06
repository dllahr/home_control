const assert = require('assert');
const uei = require('./update_electric_imp');
const run_tests = require('./run_tests');


var testCases = {};


testCases.testValidate = function() {
    console.log('test_update_electric_imp testValidate')

    const setTempData = {
        device: 'my test device',
        times: [10, 20, 30],
        temperatures: ["50", "60", "70"]
    };
    const electricImpConfig = {
        'my test device': null
    };

    var r = uei.validate(setTempData, electricImpConfig, 42);
    console.log('simple happy path - expect empty string (no error message) - r:');
    console.log(r);
    assert('' == r);
    console.log('setTempData.temperatures:');
    console.log(setTempData.temperatures);
    for (var i = 0; i < setTempData.temperatures.length; i++) {
        const curTempType = typeof(setTempData.temperatures[i]);
        console.log('curTempType:  ' + curTempType);
        assert("number" == curTempType);
    }

    r = uei.validate(setTempData, electricImpConfig, 51);
    console.log('error message expected - temperature too low - r:');
    console.log(r);
    assert(r.length > 0);
    const expectedLowTemp = 'That\'s too cold super bear!  This entry is less than the minimum temperature';
    assert(r.substring(0, expectedLowTemp.length) == expectedLowTemp);

    setTempData.times[1] = 9;
    r = uei.validate(setTempData, electricImpConfig, 42);
    console.log('error message expected - 2nd time less than first - r:');
    console.log(r);
    assert(r.length > 0);
    const expectedTime = 'Hello super bear!  All times must be increasing';
    assert(r.substring(0, expectedTime.length) == expectedTime);

    setTempData.times[1] = 20;
    setTempData.device = 'another device';
    r = uei.validate(setTempData, electricImpConfig, 42);
    console.log('error message expected - device in data not found in electric imp config - r:');
    console.log(r);
    assert(r.length > 0);
    const expectedDevice = 'Device to set temperature for not recognized';
    assert(r.substring(0, expectedDevice.length) == expectedDevice);

    setTempData.times[1] = 9;
    setTempData.times[2] = 8;
    r = uei.validate(setTempData, electricImpConfig, 61);
    console.log('error message expected - every problem possible - r:');
    console.log(r);
    assert(r.length > 0);
    assert(r.indexOf(expectedLowTemp) != -1);
    assert(r.indexOf(expectedTime) != -1);
    assert(r.indexOf(expectedDevice) != -1);
};

run_tests.run(process.argv, testCases);

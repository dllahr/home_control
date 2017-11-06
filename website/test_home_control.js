
$TestHomeControl = (function(window) {
    var my = window['$TestHomeControl'] || {};

    return my;
})(window);


$TestHomeControl.testConvertTimeToSeconds = function() {
    console.log('test_home_control testConvertTimeToSeconds');

    var timeStr = "10:01am";
    var r = $HomeControl.convertTimeToSeconds(timeStr);
    console.log(timeStr + " converted to r:  " + r);
    if (36060 != r) {
        throw 'conversion did not produce expected result';
    }

    timeStr = "9:02pm";
    r = $HomeControl.convertTimeToSeconds(timeStr);
    console.log(timeStr + " converted to r:  " + r);
    if (75720 != r) {
        throw 'conversion did not produce expected result';
    }

    timeStr = "12:00pm";
    r = $HomeControl.convertTimeToSeconds(timeStr);
    console.log(timeStr + " converted to r:  " + r);
    if (43200 != r) {
        throw 'conversion did not produce expected result';
    }

    timeStr = "12:00am";
    r = $HomeControl.convertTimeToSeconds(timeStr);
    console.log(timeStr + " converted to r:  " + r);
    if (0 != r) {
        throw 'conversion did not produce expected result';
    }
};


$TestHomeControl.testConvertInputTimeStrings = function() {
    const inputTimes = ["9:02am", "10:00pm", "should not matter"];
    var r = $HomeControl.convertInputTimeStrings(inputTimes);
    console.log('inputTimes:  ' + JSON.stringify(inputTimes) + '  r:  ' + JSON.stringify(r));
    if (r.length != inputTimes.length) {
        throw 'expected result to have 3 entries, matching input';
    }
    if (r[r.length-1] != $HomeControl.endOfDaySeconds) {
        throw 'expected last entry to be end of day, it was not';
    }
};


$TestHomeControl.testAll = function() {
    $TestHomeControl.testConvertTimeToSeconds();
    $TestHomeControl.testConvertInputTimeStrings();
};

// simple script demonstrating disconnecting and reconnecting to wifi

server.log("hello world");

imp.enableblinkup(false);

const wakeup_delay = 10;
const checkin_interval = 6;

// local mosfet_gate = null;
local mosfet_gate = hardware.pin1;
mosfet_gate.configure(DIGITAL_OUT, 0);
    
local i = 0;

function loop() {
    local mosfet_output = i % 2;
    
    // server.log(format("running the loop i: %i  mosfet_output: %i", i, mosfet_output));
    
    mosfet_gate.write(mosfet_output);
    
    i++;
    
    imp.wakeup(wakeup_delay, loop);
    
    if (i%checkin_interval == 0) {
        server.log(format("checking in i:  %i", i));
        disconnect();
    }
}

function disconnect() {
    server.log(format("Going offline i:  %i", i));
    server.flush(10);
    server.disconnect();
}

imp.onidle(function() {
    disconnect();
    
    // server.log(format("right after disconnect i:  %i", i))
    
    imp.wakeup(wakeup_delay, loop);
});

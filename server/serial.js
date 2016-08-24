

/*
G91      absolute (G90) and relative (G91) coordinates.
G1 E10   F3600 X14.28 Y99.43 Z1.75 E3.58
           F speed in mm/min
           F at end: acceleration
G28 X     Home X (Y, Z)
M84       Disable steppers
M84 S0    disable stepper timeout
*/

log = function() {console.log.apply(null, arguments)};
log ("serial.js started");

proc = require('child_process');
SerialPort = require('serialport');

exports.listPorts = listPorts = function() {
  try{
    serialPortList = proc.execSync(
                     'serialport-list -f json',
                     {timeout:3000}).toString();
  } catch(e) {
    log ('P3: Error finding list of serial ports');
    throw(e);
  }
  var ports = JSON.parse(serialPortList);
  log('p3:', 'serial ports found ...\n', ports);
  return ports;
}

exports.findPort = function(tryThisPort, cb) {
  if (typeof tryThisPort == 'function') {
    cb = tryThisPort;
    tryThisPort = '';
  }
  portTimeout = null;

  ports = listPorts();

  tryPort = function() {
    try {
      portName = ports.shift().comName;
    }catch(e) {
      log("p3: Unable to find serial port");
      cb("Unable to find serial port");
      return;
    }
    if(tryThisPort && tryThisPort !== portName) {
      setImmediate(tryPort);
      return;
    }
    log('p3:', 'trying serial port', portName);
    port = new SerialPort('/dev/'+portName, {
        baudrate: 115200,
        databits: 8,
        parity:  'none',
        stopbits: 1,
        flowcontrol: 0
      });

    port.on('error', function(err) {
      cb(err);
    });

    gotOK = false;

    port.on('open', function() {
      log('p3', "serial port", portName, 'open');
      buf = 'G91\rM84 S0\r';
      log(buf);

      port.write(buf, function(err, writeLen) {
        if(err) log('p3: serial write err', err);
      });

      port.on('data', function(buf) {
        buf=buf.toString();
        log('p3: received', buf, 'on serial port');
        if(buf.indexOf('ok') > -1) {
          gotOK = true;
        };
      });
    });

    portTimeout = setTimeout(function() {
      if(!gotOK) {
        port.close();
        setImmediate(tryPort);
        return;
      }
      log('p3: using serial port', portName);
      cb(null, portName);
    }, 2000);
  }
  tryPort();

  exports.spinRel = function(delta) {
    if(!port.isOpen()) {
      log('spinRel call when port not open');
      return false;
    };
    buf = 'G1 E' + (+delta).toFixed(2) + '\r';
    log(buf);
    port.write(buf, function(err, writeLen) {
      if(err) log('spinRel write err', err);
    });
  }

  exports.unlockSteppers = function() {
    if(!port.isOpen()) {
      log('unlockSteppers call when port not open');
      return false;
    };
    buf = 'M84\r';
    log(buf);
    port.write(buf, function(err, writeLen) {
      if(err) log('spinRel write err', err);
    });
  }
}


log = function() {console.log.apply(null, arguments)};

SerialPort = require('serialport');

port = new SerialPort('/dev/ttyACM0', {
    baudrate: 115200,
    databits: 8,
    parity:  'none',
    stopbits: 1,
    flowcontrol: 0
  });


port.on('error', function(err) {
  log('port err', err);
});

gotOK = false;

port.on('open', function() {
  log('port open');
  port.on('data', function(buf) {
    log('received', buf);
    if(buf === 'OK') {
      gotOK = true;
    };
  });
});

exports.spinRel = function(delta) {
  if(!port.isOpen()) {
    log('spinRel call when port not open');
    return false;
  };
  buf = 'G1 E' + delta.toFixed(2) + '\r';
  log('spinRel writing', buf);
  port.write(buf, function(err, writeLen) {
    if(err) log('spinRel write err', err);
    else log('spinRel wrote ' + writeLen + 'chars');
  });
}

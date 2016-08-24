

serial = require('./serial');

log = function() {console.log.apply(null, arguments)};

currentW = 0;
currentAngle = 0;

ratio = 0.165;

module.exports = function(query) {
  if(query.angle == '9999') {
    currentW = 0;
    currentAngle = 0;
    log('reset position');
    return;
  }
  if(query.angle == '8888') {
    serial.unlockSteppers();
    log('unlock steppers');
    return;
  }
  deltaW = 0;
  if(query.angle)  {
    query.angle = +query.angle;
    log ('angle', query.angle);
    newW = query.angle * ratio;
    deltaW = +(newW-currentW).toFixed(2)
    if (newW >= -370*ratio && newW < 370*ratio)
      serial.spinRel(deltaW);
    else {
      log('out of bounds', newW);
      return;
    }
  }
  currentW += deltaW;
  currentAngle = currentW/ratio;
  log ('newAngle', currentAngle.toFixed(2));
  log ('deltaW', deltaW.toFixed(2));
  log ('newW', currentW.toFixed(2));
  return;
};


serial = require('./serial');

log = function() {console.log.apply(null, arguments)};

currentW = 0;
ratio = 0.85

module.exports = function(query) {
  if(query.angle)  {
    log ('angle',query.angle);
    ratio = (query.angle/currentW).toFixed(3);
  }
  if(query.deltaW && query.deltaW < 99) {
    log ('deltaW', query.deltaW);
    delta = query.deltaW.toFixed(2);
    serial.spinRel(+delta);
    currentW += +delta;
  }
  if(query.deltaW == 99) {
    currentW = 0;
  }
  return [currentW, ratio];
};

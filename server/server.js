
log = function() {console.log.apply(null, arguments)};

process.on("uncaughtException", function(err) {
  return log("Uncaught Exception: " + err);
});

fs   = require('fs-plus');
http = require('http');

nodeStatic = require('node-static');
_ = require('lodash');
require('./ajax');
fileServer = new nodeStatic.Server(null);

log('P3 app');

html = fs.readFileSync('client/index.html');

srvr = http.createServer(function(req, res) {

  switch (req.url) {
    case '/':
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      return res.end(html);

    case '/favicon.ico':
      res.writeHead(200, {
        'Content-Type': 'image/vnd.microsoft.icon'
      });
      return res.end(fs.readFileSync('server/images/favicon.ico'));

    default:
      req.addListener('end', function() {
        fileServer.serve(req, res, function(err) {
          var _ref;
          if (err && ((_ref = req.url.slice(-4)) !== '.map' && _ref !== '.ico' && _ref !== 'ined')) {
            return done('fileServer BAD URL: ' + req.url);
          }
        })
      }).resume();
  }
});

srvr.listen(1234);

log('listening on port', 1234);

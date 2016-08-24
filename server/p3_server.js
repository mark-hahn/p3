log = function() {console.log.apply(null, arguments)};
log('p3_server started');

process.on("p3: uncaughtException", function(err) {
  return log("Uncaught Exception\n", util.inspect(err));
});

fs   = require('fs-plus');
util = require('util');
http = require('http');
url = require('url');

_ = require('lodash');
nodeStatic = require('node-static');
fileServer = new nodeStatic.Server(null);

ajax = require('./ajax');
srvr = http.createServer(function(req, res) {

  urlObj = url.parse(req.url, true);

  switch (urlObj.pathname) {
    case '/':
      res.writeHead(200, {
        'Content-Type': 'text/html'
      });
      return res.end(fs.readFileSync('client/index.html'));

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
            log('fileServer BAD URL: ' + req.url);
          }
        })
      }).resume();
  }
});

srvr.listen(1234);

log('listening on port', 1234);

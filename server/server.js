
log = function() {console.log.apply(null, arguments)};

// process.on("uncaughtException", function(err) {
//   return log("Uncaught Exception: " + err);
// });

fs   = require('fs-plus');
http = require('http');
url = require('url');
ajax = require('./ajax');

nodeStatic = require('node-static');
_ = require('lodash');
require('./ajax');
fileServer = new nodeStatic.Server(null);

log('P3 app');

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

    case '/form':
      res.writeHead(200, {
        'Content-Type': 'text/plain'
      });
      res = ajax(urlObj.query);
      return res.end(util.inspect(res));

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

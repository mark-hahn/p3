(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
 /*
  Live.js - One script closer to Designing in the Browser
  Written for Handcraft.com by Martin Kool (@mrtnkl).

  Version 4.
  Recent change: Made stylesheet and mimetype checks case insensitive.

  http://livejs.com
  http://livejs.com/license (MIT)
  @livejs

  Include live.js#css to monitor css changes only.
  Include live.js#js to monitor js changes only.
  Include live.js#html to monitor html changes only.
  Mix and match to monitor a preferred combination such as live.js#html,css

  By default, just include live.js to monitor all css, js and html changes.

  Live.js can also be loaded as a bookmarklet. It is best to only use it for CSS then,
  as a page reload due to a change in html or css would not re-include the bookmarklet.
  To monitor CSS and be notified that it has loaded, include it as: live.js#css,notify
*/
(function () {

  var headers = { "Etag": 1, "Last-Modified": 1, "Content-Length": 1, "Content-Type": 1 },
      resources = {},
      pendingRequests = {},
      currentLinkElements = {},
      oldLinkElements = {},
      interval = 1000,
      loaded = false,
      active = { "html": 1, "css": 1, "js": 1 };

  var Live = {

    // performs a cycle per interval
    heartbeat: function () {
      if (document.body) {
        // make sure all resources are loaded on first activation
        if (!loaded) Live.loadresources();
        Live.checkForChanges();
      }
      setTimeout(Live.heartbeat, interval);
    },

    // loads all local css and js resources upon first activation
    loadresources: function () {

      // helper method to assert if a given url is local
      function isLocal(url) {
        var loc = document.location,
            reg = new RegExp("^\\.|^\/(?!\/)|^[\\w]((?!://).)*$|" + loc.protocol + "//" + loc.host);
        return url.match(reg);
      }

      // gather all resources
      var scripts = document.getElementsByTagName("script"),
          links = document.getElementsByTagName("link"),
          uris = [];

      // track local js urls
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i], src = script.getAttribute("src");
        if (src && isLocal(src))
          uris.push(src);
        if (src && src.match(/\blive.js#/)) {
          for (var type in active)
            active[type] = src.match("[#,|]" + type) != null
          if (src.match("notify"))
            alert("Live.js is loaded.");
        }
      }
      if (!active.js) uris = [];
      if (active.html) uris.push(document.location.href);

      // track local css urls
      for (var i = 0; i < links.length && active.css; i++) {
        var link = links[i], rel = link.getAttribute("rel"), href = link.getAttribute("href", 2);
        if (href && rel && rel.match(new RegExp("stylesheet", "i")) && isLocal(href)) {
          uris.push(href);
          currentLinkElements[href] = link;
        }
      }

      // initialize the resources info
      for (var i = 0; i < uris.length; i++) {
        var url = uris[i];
        Live.getHead(url, function (url, info) {
          resources[url] = info;
        });
      }

      // add rule for morphing between old and new css files
      var head = document.getElementsByTagName("head")[0],
          style = document.createElement("style"),
          rule = "transition: all .3s ease-out;"
      css = [".livejs-loading * { ", rule, " -webkit-", rule, "-moz-", rule, "-o-", rule, "}"].join('');
      style.setAttribute("type", "text/css");
      head.appendChild(style);
      style.styleSheet ? style.styleSheet.cssText = css : style.appendChild(document.createTextNode(css));

      // yep
      loaded = true;
    },

    // check all tracking resources for changes
    checkForChanges: function () {
      for (var url in resources) {
        if (pendingRequests[url])
          continue;

        Live.getHead(url, function (url, newInfo) {
          var oldInfo = resources[url],
              hasChanged = false;
          resources[url] = newInfo;
          for (var header in oldInfo) {
            // do verification based on the header type
            var oldValue = oldInfo[header],
                newValue = newInfo[header],
                contentType = newInfo["Content-Type"];
            switch (header.toLowerCase()) {
              case "etag":
                if (!newValue) break;
                // fall through to default
              default:
                hasChanged = oldValue != newValue;
                break;
            }
            // if changed, act
            if (hasChanged) {
              Live.refreshResource(url, contentType);
              break;
            }
          }
        });
      }
    },

    // act upon a changed url of certain content type
    refreshResource: function (url, type) {
      switch (type.toLowerCase()) {
        // css files can be reloaded dynamically by replacing the link element
        case "text/css":
          var link = currentLinkElements[url],
              html = document.body.parentNode,
              head = link.parentNode,
              next = link.nextSibling,
              newLink = document.createElement("link");

          html.className = html.className.replace(/\s*livejs\-loading/gi, '') + ' livejs-loading';
          newLink.setAttribute("type", "text/css");
          newLink.setAttribute("rel", "stylesheet");
          newLink.setAttribute("href", url + "?now=" + new Date() * 1);
          next ? head.insertBefore(newLink, next) : head.appendChild(newLink);
          currentLinkElements[url] = newLink;
          oldLinkElements[url] = link;

          // schedule removal of the old link
          Live.removeoldLinkElements();
          break;

        // check if an html resource is our current url, then reload
        case "text/html":
          if (url != document.location.href)
            return;

          // local javascript changes cause a reload as well
        case "text/javascript":
        case "application/javascript":
        case "application/x-javascript":
          document.location.reload();
      }
    },

    // removes the old stylesheet rules only once the new one has finished loading
    removeoldLinkElements: function () {
      var pending = 0;
      for (var url in oldLinkElements) {
        // if this sheet has any cssRules, delete the old link
        try {
          var link = currentLinkElements[url],
              oldLink = oldLinkElements[url],
              html = document.body.parentNode,
              sheet = link.sheet || link.styleSheet,
              rules = sheet.rules || sheet.cssRules;
          if (rules.length >= 0) {
            oldLink.parentNode.removeChild(oldLink);
            delete oldLinkElements[url];
            setTimeout(function () {
              html.className = html.className.replace(/\s*livejs\-loading/gi, '');
            }, 100);
          }
        } catch (e) {
          pending++;
        }
        if (pending) setTimeout(Live.removeoldLinkElements, 50);
      }
    },

    // performs a HEAD request and passes the header info to the given callback
    getHead: function (url, callback) {
      pendingRequests[url] = true;
      var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XmlHttp");
      xhr.open("HEAD", url, true);
      xhr.onreadystatechange = function () {
        delete pendingRequests[url];
        if (xhr.readyState == 4 && xhr.status != 304) {
          xhr.getAllResponseHeaders();
          var info = {};
          for (var h in headers) {
            var value = xhr.getResponseHeader(h);
            // adjust the simple Etag variant to match on its significant part
            if (h.toLowerCase() == "etag" && value) value = value.replace(/^W\//, '');
            if (h.toLowerCase() == "content-type" && value) value = value.replace(/^(.*?);.*?$/i, "$1");
            info[h] = value;
          }
          callback(url, info);
        }
      }
      xhr.send();
    }
  };

  // start listening
  if (document.location.protocol != "file:") {
    if (!window.liveJsLoaded)
      Live.heartbeat();

    window.liveJsLoaded = true;
  }
  else if (window.console)
    console.log("Live.js doesn't support the file protocol. It needs http.");
})();

},{}],2:[function(require,module,exports){

require('./live');

},{"./live":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NS4xMS4wL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImNsaWVudC9saXZlLmpzIiwiY2xpZW50L21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek9BO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIgLypcbiAgTGl2ZS5qcyAtIE9uZSBzY3JpcHQgY2xvc2VyIHRvIERlc2lnbmluZyBpbiB0aGUgQnJvd3NlclxuICBXcml0dGVuIGZvciBIYW5kY3JhZnQuY29tIGJ5IE1hcnRpbiBLb29sIChAbXJ0bmtsKS5cblxuICBWZXJzaW9uIDQuXG4gIFJlY2VudCBjaGFuZ2U6IE1hZGUgc3R5bGVzaGVldCBhbmQgbWltZXR5cGUgY2hlY2tzIGNhc2UgaW5zZW5zaXRpdmUuXG5cbiAgaHR0cDovL2xpdmVqcy5jb21cbiAgaHR0cDovL2xpdmVqcy5jb20vbGljZW5zZSAoTUlUKVxuICBAbGl2ZWpzXG5cbiAgSW5jbHVkZSBsaXZlLmpzI2NzcyB0byBtb25pdG9yIGNzcyBjaGFuZ2VzIG9ubHkuXG4gIEluY2x1ZGUgbGl2ZS5qcyNqcyB0byBtb25pdG9yIGpzIGNoYW5nZXMgb25seS5cbiAgSW5jbHVkZSBsaXZlLmpzI2h0bWwgdG8gbW9uaXRvciBodG1sIGNoYW5nZXMgb25seS5cbiAgTWl4IGFuZCBtYXRjaCB0byBtb25pdG9yIGEgcHJlZmVycmVkIGNvbWJpbmF0aW9uIHN1Y2ggYXMgbGl2ZS5qcyNodG1sLGNzc1xuXG4gIEJ5IGRlZmF1bHQsIGp1c3QgaW5jbHVkZSBsaXZlLmpzIHRvIG1vbml0b3IgYWxsIGNzcywganMgYW5kIGh0bWwgY2hhbmdlcy5cblxuICBMaXZlLmpzIGNhbiBhbHNvIGJlIGxvYWRlZCBhcyBhIGJvb2ttYXJrbGV0LiBJdCBpcyBiZXN0IHRvIG9ubHkgdXNlIGl0IGZvciBDU1MgdGhlbixcbiAgYXMgYSBwYWdlIHJlbG9hZCBkdWUgdG8gYSBjaGFuZ2UgaW4gaHRtbCBvciBjc3Mgd291bGQgbm90IHJlLWluY2x1ZGUgdGhlIGJvb2ttYXJrbGV0LlxuICBUbyBtb25pdG9yIENTUyBhbmQgYmUgbm90aWZpZWQgdGhhdCBpdCBoYXMgbG9hZGVkLCBpbmNsdWRlIGl0IGFzOiBsaXZlLmpzI2Nzcyxub3RpZnlcbiovXG4oZnVuY3Rpb24gKCkge1xuXG4gIHZhciBoZWFkZXJzID0geyBcIkV0YWdcIjogMSwgXCJMYXN0LU1vZGlmaWVkXCI6IDEsIFwiQ29udGVudC1MZW5ndGhcIjogMSwgXCJDb250ZW50LVR5cGVcIjogMSB9LFxuICAgICAgcmVzb3VyY2VzID0ge30sXG4gICAgICBwZW5kaW5nUmVxdWVzdHMgPSB7fSxcbiAgICAgIGN1cnJlbnRMaW5rRWxlbWVudHMgPSB7fSxcbiAgICAgIG9sZExpbmtFbGVtZW50cyA9IHt9LFxuICAgICAgaW50ZXJ2YWwgPSAxMDAwLFxuICAgICAgbG9hZGVkID0gZmFsc2UsXG4gICAgICBhY3RpdmUgPSB7IFwiaHRtbFwiOiAxLCBcImNzc1wiOiAxLCBcImpzXCI6IDEgfTtcblxuICB2YXIgTGl2ZSA9IHtcblxuICAgIC8vIHBlcmZvcm1zIGEgY3ljbGUgcGVyIGludGVydmFsXG4gICAgaGVhcnRiZWF0OiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoZG9jdW1lbnQuYm9keSkge1xuICAgICAgICAvLyBtYWtlIHN1cmUgYWxsIHJlc291cmNlcyBhcmUgbG9hZGVkIG9uIGZpcnN0IGFjdGl2YXRpb25cbiAgICAgICAgaWYgKCFsb2FkZWQpIExpdmUubG9hZHJlc291cmNlcygpO1xuICAgICAgICBMaXZlLmNoZWNrRm9yQ2hhbmdlcygpO1xuICAgICAgfVxuICAgICAgc2V0VGltZW91dChMaXZlLmhlYXJ0YmVhdCwgaW50ZXJ2YWwpO1xuICAgIH0sXG5cbiAgICAvLyBsb2FkcyBhbGwgbG9jYWwgY3NzIGFuZCBqcyByZXNvdXJjZXMgdXBvbiBmaXJzdCBhY3RpdmF0aW9uXG4gICAgbG9hZHJlc291cmNlczogZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBoZWxwZXIgbWV0aG9kIHRvIGFzc2VydCBpZiBhIGdpdmVuIHVybCBpcyBsb2NhbFxuICAgICAgZnVuY3Rpb24gaXNMb2NhbCh1cmwpIHtcbiAgICAgICAgdmFyIGxvYyA9IGRvY3VtZW50LmxvY2F0aW9uLFxuICAgICAgICAgICAgcmVnID0gbmV3IFJlZ0V4cChcIl5cXFxcLnxeXFwvKD8hXFwvKXxeW1xcXFx3XSgoPyE6Ly8pLikqJHxcIiArIGxvYy5wcm90b2NvbCArIFwiLy9cIiArIGxvYy5ob3N0KTtcbiAgICAgICAgcmV0dXJuIHVybC5tYXRjaChyZWcpO1xuICAgICAgfVxuXG4gICAgICAvLyBnYXRoZXIgYWxsIHJlc291cmNlc1xuICAgICAgdmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInNjcmlwdFwiKSxcbiAgICAgICAgICBsaW5rcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwibGlua1wiKSxcbiAgICAgICAgICB1cmlzID0gW107XG5cbiAgICAgIC8vIHRyYWNrIGxvY2FsIGpzIHVybHNcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2NyaXB0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc2NyaXB0ID0gc2NyaXB0c1tpXSwgc3JjID0gc2NyaXB0LmdldEF0dHJpYnV0ZShcInNyY1wiKTtcbiAgICAgICAgaWYgKHNyYyAmJiBpc0xvY2FsKHNyYykpXG4gICAgICAgICAgdXJpcy5wdXNoKHNyYyk7XG4gICAgICAgIGlmIChzcmMgJiYgc3JjLm1hdGNoKC9cXGJsaXZlLmpzIy8pKSB7XG4gICAgICAgICAgZm9yICh2YXIgdHlwZSBpbiBhY3RpdmUpXG4gICAgICAgICAgICBhY3RpdmVbdHlwZV0gPSBzcmMubWF0Y2goXCJbIyx8XVwiICsgdHlwZSkgIT0gbnVsbFxuICAgICAgICAgIGlmIChzcmMubWF0Y2goXCJub3RpZnlcIikpXG4gICAgICAgICAgICBhbGVydChcIkxpdmUuanMgaXMgbG9hZGVkLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKCFhY3RpdmUuanMpIHVyaXMgPSBbXTtcbiAgICAgIGlmIChhY3RpdmUuaHRtbCkgdXJpcy5wdXNoKGRvY3VtZW50LmxvY2F0aW9uLmhyZWYpO1xuXG4gICAgICAvLyB0cmFjayBsb2NhbCBjc3MgdXJsc1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5rcy5sZW5ndGggJiYgYWN0aXZlLmNzczsgaSsrKSB7XG4gICAgICAgIHZhciBsaW5rID0gbGlua3NbaV0sIHJlbCA9IGxpbmsuZ2V0QXR0cmlidXRlKFwicmVsXCIpLCBocmVmID0gbGluay5nZXRBdHRyaWJ1dGUoXCJocmVmXCIsIDIpO1xuICAgICAgICBpZiAoaHJlZiAmJiByZWwgJiYgcmVsLm1hdGNoKG5ldyBSZWdFeHAoXCJzdHlsZXNoZWV0XCIsIFwiaVwiKSkgJiYgaXNMb2NhbChocmVmKSkge1xuICAgICAgICAgIHVyaXMucHVzaChocmVmKTtcbiAgICAgICAgICBjdXJyZW50TGlua0VsZW1lbnRzW2hyZWZdID0gbGluaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBpbml0aWFsaXplIHRoZSByZXNvdXJjZXMgaW5mb1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB1cmlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB1cmwgPSB1cmlzW2ldO1xuICAgICAgICBMaXZlLmdldEhlYWQodXJsLCBmdW5jdGlvbiAodXJsLCBpbmZvKSB7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSBpbmZvO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gYWRkIHJ1bGUgZm9yIG1vcnBoaW5nIGJldHdlZW4gb2xkIGFuZCBuZXcgY3NzIGZpbGVzXG4gICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaGVhZFwiKVswXSxcbiAgICAgICAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKSxcbiAgICAgICAgICBydWxlID0gXCJ0cmFuc2l0aW9uOiBhbGwgLjNzIGVhc2Utb3V0O1wiXG4gICAgICBjc3MgPSBbXCIubGl2ZWpzLWxvYWRpbmcgKiB7IFwiLCBydWxlLCBcIiAtd2Via2l0LVwiLCBydWxlLCBcIi1tb3otXCIsIHJ1bGUsIFwiLW8tXCIsIHJ1bGUsIFwifVwiXS5qb2luKCcnKTtcbiAgICAgIHN0eWxlLnNldEF0dHJpYnV0ZShcInR5cGVcIiwgXCJ0ZXh0L2Nzc1wiKTtcbiAgICAgIGhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xuICAgICAgc3R5bGUuc3R5bGVTaGVldCA/IHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcyA6IHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuXG4gICAgICAvLyB5ZXBcbiAgICAgIGxvYWRlZCA9IHRydWU7XG4gICAgfSxcblxuICAgIC8vIGNoZWNrIGFsbCB0cmFja2luZyByZXNvdXJjZXMgZm9yIGNoYW5nZXNcbiAgICBjaGVja0ZvckNoYW5nZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGZvciAodmFyIHVybCBpbiByZXNvdXJjZXMpIHtcbiAgICAgICAgaWYgKHBlbmRpbmdSZXF1ZXN0c1t1cmxdKVxuICAgICAgICAgIGNvbnRpbnVlO1xuXG4gICAgICAgIExpdmUuZ2V0SGVhZCh1cmwsIGZ1bmN0aW9uICh1cmwsIG5ld0luZm8pIHtcbiAgICAgICAgICB2YXIgb2xkSW5mbyA9IHJlc291cmNlc1t1cmxdLFxuICAgICAgICAgICAgICBoYXNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgICAgcmVzb3VyY2VzW3VybF0gPSBuZXdJbmZvO1xuICAgICAgICAgIGZvciAodmFyIGhlYWRlciBpbiBvbGRJbmZvKSB7XG4gICAgICAgICAgICAvLyBkbyB2ZXJpZmljYXRpb24gYmFzZWQgb24gdGhlIGhlYWRlciB0eXBlXG4gICAgICAgICAgICB2YXIgb2xkVmFsdWUgPSBvbGRJbmZvW2hlYWRlcl0sXG4gICAgICAgICAgICAgICAgbmV3VmFsdWUgPSBuZXdJbmZvW2hlYWRlcl0sXG4gICAgICAgICAgICAgICAgY29udGVudFR5cGUgPSBuZXdJbmZvW1wiQ29udGVudC1UeXBlXCJdO1xuICAgICAgICAgICAgc3dpdGNoIChoZWFkZXIudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICBjYXNlIFwiZXRhZ1wiOlxuICAgICAgICAgICAgICAgIGlmICghbmV3VmFsdWUpIGJyZWFrO1xuICAgICAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaCB0byBkZWZhdWx0XG4gICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgaGFzQ2hhbmdlZCA9IG9sZFZhbHVlICE9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYgY2hhbmdlZCwgYWN0XG4gICAgICAgICAgICBpZiAoaGFzQ2hhbmdlZCkge1xuICAgICAgICAgICAgICBMaXZlLnJlZnJlc2hSZXNvdXJjZSh1cmwsIGNvbnRlbnRUeXBlKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gYWN0IHVwb24gYSBjaGFuZ2VkIHVybCBvZiBjZXJ0YWluIGNvbnRlbnQgdHlwZVxuICAgIHJlZnJlc2hSZXNvdXJjZTogZnVuY3Rpb24gKHVybCwgdHlwZSkge1xuICAgICAgc3dpdGNoICh0eXBlLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgLy8gY3NzIGZpbGVzIGNhbiBiZSByZWxvYWRlZCBkeW5hbWljYWxseSBieSByZXBsYWNpbmcgdGhlIGxpbmsgZWxlbWVudFxuICAgICAgICBjYXNlIFwidGV4dC9jc3NcIjpcbiAgICAgICAgICB2YXIgbGluayA9IGN1cnJlbnRMaW5rRWxlbWVudHNbdXJsXSxcbiAgICAgICAgICAgICAgaHRtbCA9IGRvY3VtZW50LmJvZHkucGFyZW50Tm9kZSxcbiAgICAgICAgICAgICAgaGVhZCA9IGxpbmsucGFyZW50Tm9kZSxcbiAgICAgICAgICAgICAgbmV4dCA9IGxpbmsubmV4dFNpYmxpbmcsXG4gICAgICAgICAgICAgIG5ld0xpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlua1wiKTtcblxuICAgICAgICAgIGh0bWwuY2xhc3NOYW1lID0gaHRtbC5jbGFzc05hbWUucmVwbGFjZSgvXFxzKmxpdmVqc1xcLWxvYWRpbmcvZ2ksICcnKSArICcgbGl2ZWpzLWxvYWRpbmcnO1xuICAgICAgICAgIG5ld0xpbmsuc2V0QXR0cmlidXRlKFwidHlwZVwiLCBcInRleHQvY3NzXCIpO1xuICAgICAgICAgIG5ld0xpbmsuc2V0QXR0cmlidXRlKFwicmVsXCIsIFwic3R5bGVzaGVldFwiKTtcbiAgICAgICAgICBuZXdMaW5rLnNldEF0dHJpYnV0ZShcImhyZWZcIiwgdXJsICsgXCI/bm93PVwiICsgbmV3IERhdGUoKSAqIDEpO1xuICAgICAgICAgIG5leHQgPyBoZWFkLmluc2VydEJlZm9yZShuZXdMaW5rLCBuZXh0KSA6IGhlYWQuYXBwZW5kQ2hpbGQobmV3TGluayk7XG4gICAgICAgICAgY3VycmVudExpbmtFbGVtZW50c1t1cmxdID0gbmV3TGluaztcbiAgICAgICAgICBvbGRMaW5rRWxlbWVudHNbdXJsXSA9IGxpbms7XG5cbiAgICAgICAgICAvLyBzY2hlZHVsZSByZW1vdmFsIG9mIHRoZSBvbGQgbGlua1xuICAgICAgICAgIExpdmUucmVtb3Zlb2xkTGlua0VsZW1lbnRzKCk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgLy8gY2hlY2sgaWYgYW4gaHRtbCByZXNvdXJjZSBpcyBvdXIgY3VycmVudCB1cmwsIHRoZW4gcmVsb2FkXG4gICAgICAgIGNhc2UgXCJ0ZXh0L2h0bWxcIjpcbiAgICAgICAgICBpZiAodXJsICE9IGRvY3VtZW50LmxvY2F0aW9uLmhyZWYpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAvLyBsb2NhbCBqYXZhc2NyaXB0IGNoYW5nZXMgY2F1c2UgYSByZWxvYWQgYXMgd2VsbFxuICAgICAgICBjYXNlIFwidGV4dC9qYXZhc2NyaXB0XCI6XG4gICAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0XCI6XG4gICAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi94LWphdmFzY3JpcHRcIjpcbiAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gcmVtb3ZlcyB0aGUgb2xkIHN0eWxlc2hlZXQgcnVsZXMgb25seSBvbmNlIHRoZSBuZXcgb25lIGhhcyBmaW5pc2hlZCBsb2FkaW5nXG4gICAgcmVtb3Zlb2xkTGlua0VsZW1lbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcGVuZGluZyA9IDA7XG4gICAgICBmb3IgKHZhciB1cmwgaW4gb2xkTGlua0VsZW1lbnRzKSB7XG4gICAgICAgIC8vIGlmIHRoaXMgc2hlZXQgaGFzIGFueSBjc3NSdWxlcywgZGVsZXRlIHRoZSBvbGQgbGlua1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHZhciBsaW5rID0gY3VycmVudExpbmtFbGVtZW50c1t1cmxdLFxuICAgICAgICAgICAgICBvbGRMaW5rID0gb2xkTGlua0VsZW1lbnRzW3VybF0sXG4gICAgICAgICAgICAgIGh0bWwgPSBkb2N1bWVudC5ib2R5LnBhcmVudE5vZGUsXG4gICAgICAgICAgICAgIHNoZWV0ID0gbGluay5zaGVldCB8fCBsaW5rLnN0eWxlU2hlZXQsXG4gICAgICAgICAgICAgIHJ1bGVzID0gc2hlZXQucnVsZXMgfHwgc2hlZXQuY3NzUnVsZXM7XG4gICAgICAgICAgaWYgKHJ1bGVzLmxlbmd0aCA+PSAwKSB7XG4gICAgICAgICAgICBvbGRMaW5rLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQob2xkTGluayk7XG4gICAgICAgICAgICBkZWxldGUgb2xkTGlua0VsZW1lbnRzW3VybF07XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgaHRtbC5jbGFzc05hbWUgPSBodG1sLmNsYXNzTmFtZS5yZXBsYWNlKC9cXHMqbGl2ZWpzXFwtbG9hZGluZy9naSwgJycpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBwZW5kaW5nKys7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBlbmRpbmcpIHNldFRpbWVvdXQoTGl2ZS5yZW1vdmVvbGRMaW5rRWxlbWVudHMsIDUwKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gcGVyZm9ybXMgYSBIRUFEIHJlcXVlc3QgYW5kIHBhc3NlcyB0aGUgaGVhZGVyIGluZm8gdG8gdGhlIGdpdmVuIGNhbGxiYWNrXG4gICAgZ2V0SGVhZDogZnVuY3Rpb24gKHVybCwgY2FsbGJhY2spIHtcbiAgICAgIHBlbmRpbmdSZXF1ZXN0c1t1cmxdID0gdHJ1ZTtcbiAgICAgIHZhciB4aHIgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgPyBuZXcgWE1MSHR0cFJlcXVlc3QoKSA6IG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhtbEh0dHBcIik7XG4gICAgICB4aHIub3BlbihcIkhFQURcIiwgdXJsLCB0cnVlKTtcbiAgICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlbGV0ZSBwZW5kaW5nUmVxdWVzdHNbdXJsXTtcbiAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09IDQgJiYgeGhyLnN0YXR1cyAhPSAzMDQpIHtcbiAgICAgICAgICB4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCk7XG4gICAgICAgICAgdmFyIGluZm8gPSB7fTtcbiAgICAgICAgICBmb3IgKHZhciBoIGluIGhlYWRlcnMpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihoKTtcbiAgICAgICAgICAgIC8vIGFkanVzdCB0aGUgc2ltcGxlIEV0YWcgdmFyaWFudCB0byBtYXRjaCBvbiBpdHMgc2lnbmlmaWNhbnQgcGFydFxuICAgICAgICAgICAgaWYgKGgudG9Mb3dlckNhc2UoKSA9PSBcImV0YWdcIiAmJiB2YWx1ZSkgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eV1xcLy8sICcnKTtcbiAgICAgICAgICAgIGlmIChoLnRvTG93ZXJDYXNlKCkgPT0gXCJjb250ZW50LXR5cGVcIiAmJiB2YWx1ZSkgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eKC4qPyk7Lio/JC9pLCBcIiQxXCIpO1xuICAgICAgICAgICAgaW5mb1toXSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYWxsYmFjayh1cmwsIGluZm8pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB4aHIuc2VuZCgpO1xuICAgIH1cbiAgfTtcblxuICAvLyBzdGFydCBsaXN0ZW5pbmdcbiAgaWYgKGRvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sICE9IFwiZmlsZTpcIikge1xuICAgIGlmICghd2luZG93LmxpdmVKc0xvYWRlZClcbiAgICAgIExpdmUuaGVhcnRiZWF0KCk7XG5cbiAgICB3aW5kb3cubGl2ZUpzTG9hZGVkID0gdHJ1ZTtcbiAgfVxuICBlbHNlIGlmICh3aW5kb3cuY29uc29sZSlcbiAgICBjb25zb2xlLmxvZyhcIkxpdmUuanMgZG9lc24ndCBzdXBwb3J0IHRoZSBmaWxlIHByb3RvY29sLiBJdCBuZWVkcyBodHRwLlwiKTtcbn0pKCk7XG4iLCJcbnJlcXVpcmUoJy4vbGl2ZScpO1xuIl19

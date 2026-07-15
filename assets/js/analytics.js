/* Cookielose Reichweitenmessung mit selbst gehostetem Matomo (stats.kozlowski-it.de).
   - disableCookies: es werden keine Cookies gesetzt.
   - setDoNotTrack: Browser-"Do Not Track" wird respektiert (keine Messung).
   - IP-Anonymisierung + DNT sind zusaetzlich serverseitig in Matomo aktiv.
   Extern statt inline, damit die strikte CSP (script-src 'self') greift. */
(function () {
  var _paq = (window._paq = window._paq || []);
  _paq.push(["disableCookies"]);
  _paq.push(["setDoNotTrack", true]);
  _paq.push(["trackPageView"]);
  _paq.push(["enableLinkTracking"]);
  var u = "https://stats.kozlowski-it.de/";
  _paq.push(["setTrackerUrl", u + "matomo.php"]);
  _paq.push(["setSiteId", "1"]);
  var d = document,
    g = d.createElement("script"),
    s = d.getElementsByTagName("script")[0];
  g.async = true;
  g.src = u + "matomo.js";
  s.parentNode.insertBefore(g, s);
})();

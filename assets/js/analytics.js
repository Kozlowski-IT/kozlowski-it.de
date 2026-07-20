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

  // Cookielose Conversion-Signale: Klicks auf Anruf, E-Mail und Terminbuchung
  // als Matomo-Events (Grundlage fuer die Ziele). Site-weit, inkl. Header-Telefon.
  // Kein PII im Event — nur die Aktions-Art.
  d.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest && e.target.closest("a[href]");
      if (!a || !window._paq) return;
      var href = a.getAttribute("href") || "";
      // WICHTIG: window._paq, nicht die lokale Referenz. Matomo ersetzt window._paq
      // nach dem Laden durch den Tracker-Proxy; die urspruengliche Array-Referenz ist
      // danach tot, Pushes dorthin gehen verloren.
      if (href.indexOf("tel:") === 0) {
        window._paq.push(["trackEvent", "Kontakt", "Anruf-Klick"]);
      } else if (href.indexOf("mailto:") === 0) {
        window._paq.push(["trackEvent", "Kontakt", "E-Mail-Klick"]);
      } else if (href.indexOf("cal.kozlowski-it.de") !== -1) {
        window._paq.push(["trackEvent", "Kontakt", "Termin-Klick"]);
      }
    },
    true,
  );
})();

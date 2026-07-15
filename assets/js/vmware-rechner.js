/* VMware-Ausstieg-Rechner (Vanilla JS, CSP-safe: extern, kein Inline).
   Zwei Wege fuer die VMware-Kosten:
     1) bekannt   -> Nutzer traegt seine echte Jahres-Summe ein (genau, nichts geraten).
     2) schaetzen -> gerundete Listenpreise pro Kern (Marktlage), klar als Schaetzung markiert.
   Proxmox-Preise sind offizielle Listenpreise. Migration/Betrieb = Kozlowski-IT-Preise. */
(function () {
  "use strict";

  // --- Preis-Config (Stand Juli 2026) --------------------------------------
  // VMware/Broadcom: gerundete Listenpreise pro KERN/Jahr in EUR. Marktlage,
  // KEINE Zusage. Quelle: atonementlicensing.com (VMware Subscription Pricing 2026).
  var VMWARE_LIST_EUR_PER_CORE_YEAR = {
    "vsphere-standard": 50,
    "vvf": 135,
    "vcf": 350
  };
  var VMWARE_MIN_CORES_PER_CPU = 16; // Broadcom-Mindestlizenzierung je CPU.

  // Proxmox VE Subscription pro SOCKEL/Jahr in EUR. Offizielle Listenpreise,
  // Quelle: proxmox.com/.../pricing.
  var PROXMOX_EUR_PER_SOCKET_YEAR = {
    community: 120, basic: 370, standard: 550, premium: 1100
  };

  // Kozlowski IT (vom Inhaber vorgegeben):
  var MIGRATION_EUR_PER_HOST = 150;
  var BETRIEB_EUR_PER_MONTH = 149;

  var YEARS = 3;

  var eur = new Intl.NumberFormat("de-DE", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0
  });

  function $(id) { return document.getElementById(id); }
  function intVal(id) { var n = parseInt($(id).value, 10); return isNaN(n) || n < 0 ? 0 : n; }

  function selectedKostenweg() {
    var r = document.querySelector('input[name="kostenweg"]:checked');
    return r ? r.value : "bekannt";
  }
  function selectedFeatures() {
    var out = [];
    document.querySelectorAll(".r-features input[type=checkbox]:checked")
      .forEach(function (c) { out.push(c.value); });
    return out;
  }

  function toggleBranch() {
    var weg = selectedKostenweg();
    $("r-branch-bekannt").hidden = weg !== "bekannt";
    $("r-branch-schaetzen").hidden = weg !== "schaetzen";
  }

  function monthsUntil(month, year) {
    // Ohne Date.now-Abhaengigkeit im Build: aktuelles Datum aus dem Browser.
    var now = new Date();
    return (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
  }

  function row(label, value, cls) {
    return '<div class="r-row ' + (cls || "") + '"><span>' + label +
      '</span><strong>' + value + "</strong></div>";
  }

  function render() {
    var hosts = intVal("r-hosts");
    var sockets = intVal("r-sockets");
    var cores = intVal("r-cores");
    var box = $("r-ergebnis");

    if (hosts < 1 || sockets < 1 || cores < 1) {
      box.hidden = false;
      box.innerHTML = '<p class="r-warn">Bitte Hosts, Sockets und Kerne (mindestens je 1) angeben.</p>';
      return;
    }

    var weg = selectedKostenweg();
    var vmwareAnnual = null;
    var vmwareNote = "";

    if (weg === "bekannt") {
      var known = intVal("r-vmwareKosten");
      if (known <= 0) {
        box.hidden = false;
        box.innerHTML = '<p class="r-warn">Bitte Ihre aktuelle oder angebotene VMware-Summe pro Jahr eintragen, ' +
          'oder oben auf „schätzen" umstellen.</p>';
        return;
      }
      vmwareAnnual = known;
      vmwareNote = "Ihre eingetragene Jahres-Summe.";
    } else {
      var edition = $("r-edition").value;
      var perCore = VMWARE_LIST_EUR_PER_CORE_YEAR[edition];
      if (!perCore) {
        box.hidden = false;
        box.innerHTML = '<p class="r-warn">Für „' + $("r-edition").selectedOptions[0].text +
          '" gibt es keinen belastbaren Listenpreis (Essentials wurde gestrichen, Enterprise Plus ist ausgelaufen). ' +
          'Bitte oben „Ich kenne meine Summe" wählen und den Betrag vom Angebot eintragen.</p>';
        return;
      }
      var billableCoresPerCpu = Math.max(cores, VMWARE_MIN_CORES_PER_CPU);
      var billableCores = hosts * sockets * billableCoresPerCpu;
      vmwareAnnual = billableCores * perCore;
      vmwareNote = "Schätzung: " + billableCores + " lizenzpflichtige Kerne (16-Kern-Minimum je CPU) × " +
        eur.format(perCore) + "/Kern/Jahr, Listenpreis. Ihr echtes Angebot kann abweichen.";
    }

    var tierKey = $("r-proxmoxTier").value;
    var proxmoxAnnual = hosts * sockets * PROXMOX_EUR_PER_SOCKET_YEAR[tierKey];

    var vmware3 = vmwareAnnual * YEARS;
    var proxmox3 = proxmoxAnnual * YEARS;
    var migration = hosts * MIGRATION_EUR_PER_HOST;
    var proxmoxWeg3 = proxmox3 + migration;
    var diff = vmware3 - proxmoxWeg3;
    var betrieb3 = BETRIEB_EUR_PER_MONTH * 12 * YEARS;

    var html = "";
    html += "<h3>Ihr Vergleich über " + YEARS + " Jahre</h3>";
    html += '<p class="r-basis">' + hosts + " Host(s), " + (hosts * sockets) + " CPU(s), " +
      (hosts * sockets * cores) + " Kerne. " + vmwareNote + "</p>";

    html += '<div class="r-table">';
    html += row("VMware-Verlängerung (3 Jahre)", eur.format(vmware3), "r-vmware");
    html += row("Proxmox-Lizenz (3 Jahre, " + tierKey + ")", eur.format(proxmox3), "");
    html += row("Einmalige Migration (" + hosts + " × " + eur.format(MIGRATION_EUR_PER_HOST) + ")", eur.format(migration), "");
    html += row("Proxmox-Weg gesamt (3 Jahre)", eur.format(proxmoxWeg3), "r-sum");
    html += "</div>";

    if (diff > 0) {
      html += '<div class="r-diff r-diff-pos"><span>Ihre Differenz über 3 Jahre</span><strong>' +
        eur.format(diff) + "</strong></div>";
    } else {
      html += '<div class="r-diff r-diff-neg"><span>Über 3 Jahre günstiger bei VMware</span><strong>' +
        eur.format(Math.abs(diff)) + "</strong></div>";
      html += '<p class="r-note">In dieser Konstellation lohnt der Wechsel rechnerisch nicht. Das sage ich Ihnen lieber vorher.</p>';
    }

    html += '<p class="r-optional">Optional danach: laufender Betrieb durch mich ' +
      eur.format(BETRIEB_EUR_PER_MONTH) + "/Monat (über 3 Jahre " + eur.format(betrieb3) +
      "). Bewusst nicht in die Differenz eingerechnet, weil auch die VMware-Seite ohne Betriebskosten steht.</p>";

    // Ehrlicher Bleib-Hinweis bei tiefer VMware-Integration.
    var feats = selectedFeatures();
    if (feats.indexOf("vsan") > -1 || feats.indexOf("nsx") > -1) {
      html += '<p class="r-warn r-stay">Sie nutzen ' +
        (feats.indexOf("vsan") > -1 && feats.indexOf("nsx") > -1 ? "vSAN und NSX" :
          (feats.indexOf("vsan") > -1 ? "vSAN" : "NSX")) +
        '. Das ist tief in VMware integriert. Ein Wechsel ist möglich, aber aufwändiger und lohnt sich nicht immer. ' +
        'Ist Ihre Branchensoftware nur für VMware zertifiziert, gilt dasselbe. Das prüfen wir vorher ehrlich.</p>';
    }

    // Vertragsende -> Dringlichkeit.
    var m = monthsUntil(parseInt($("r-vMonat").value, 10), intVal("r-vJahr"));
    if (!isNaN(m)) {
      if (m <= 0) {
        html += '<p class="r-urg">Ihr Vertrag ist bereits abgelaufen oder läuft diesen Monat aus. Jetzt ist der Moment.</p>';
      } else if (m <= 6) {
        html += '<p class="r-urg">Ihr Vertrag endet in etwa ' + m + ' Monaten. Für eine saubere Migration in Wellen ist das genau das richtige Fenster.</p>';
      } else if (m <= 18) {
        html += '<p class="r-note">Noch ' + m + ' Monate bis Vertragsende. Genug Zeit, um in Ruhe zu planen und zu testen.</p>';
      } else {
        html += '<p class="r-note">Noch ' + m + ' Monate bis Vertragsende. Kein Zeitdruck, aber die Zahl hilft bei der Budgetplanung.</p>';
      }
    }

    html += '<div class="cta-row center r-cta"><a class="btn primary big" href="/#kontakt">Ergebnis besprechen (kostenlos)</a>' +
      '<a class="btn ghosted" href="https://cal.kozlowski-it.de/erstgespraech">Direkt Termin buchen</a></div>';
    html += '<p class="r-disclaimer">Unverbindliche Orientierung auf Basis Ihrer Angaben und öffentlicher Listenpreise. Keine rechtsverbindliche Kostenzusage.</p>';

    box.hidden = false;
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function init() {
    var form = $("vmware-rechner");
    if (!form) return;
    document.querySelectorAll('input[name="kostenweg"]').forEach(function (r) {
      r.addEventListener("change", toggleBranch);
    });
    $("r-rechnen").addEventListener("click", render);
    toggleBranch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

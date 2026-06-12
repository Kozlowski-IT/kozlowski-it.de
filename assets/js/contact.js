// Interim contact handler: switches the request-type branch, validates, and
// builds a structured, pre-filled email from the active fields. No backend,
// no third-party service — data goes straight to pk@kozlowski-it.de. Swap the
// mailto for a POST to a self-hosted endpoint once the backend is in place.
(function () {
  // Booking section: reveal + wire the button only when a Cal.com URL is set
  // (data-booking-url). Until then it stays hidden — no dead button ships.
  const booking = document.querySelector('.booking');
  if (booking) {
    const url = (booking.dataset.bookingUrl || '').trim();
    if (url) {
      booking.querySelector('.booking-btn').href = url;
      booking.hidden = false;
    }
  }

  const form = document.querySelector('.contact-form');
  if (!form) return;

  const status = form.querySelector('.form-status');
  const branches = Array.from(form.querySelectorAll('.branch'));
  const typeRadios = Array.from(form.querySelectorAll('input[name="art"]'));

  // show only the branch matching the chosen type; disable the rest so their
  // required fields neither block validation nor land in the email
  function syncBranches() {
    const chosen = form.querySelector('input[name="art"]:checked');
    const value = chosen ? chosen.value : '';
    for (const branch of branches) {
      const active = branch.dataset.branch === value;
      branch.hidden = !active;
      branch.disabled = !active;
    }
  }
  typeRadios.forEach((radio) => radio.addEventListener('change', syncBranches));
  syncBranches();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const get = (name) => {
      const el = form.elements.namedItem(name);
      return el && !el.disabled ? (el.value || '').toString().trim() : '';
    };
    if (!get('email') && !get('telefon')) {
      status.textContent =
        form.dataset.contactError || 'Bitte E-Mail oder Telefon angeben.';
      return;
    }
    status.textContent = '';

    // build the email body from all enabled, named, non-radio controls
    const chosen = form.querySelector('input[name="art"]:checked');
    const lines = [(chosen?.dataset.label || 'Art') + ': ' + (chosen?.value || ''), ''];
    for (const el of form.elements) {
      if (!el.name || el.disabled || el.type === 'radio' || el.type === 'submit') {
        continue;
      }
      const label = el.dataset.label || el.name;
      lines.push(label + ': ' + ((el.value || '').toString().trim() || '–'));
    }
    const text = lines.join('\n');
    const subject = encodeURIComponent(
      'Anfrage über kozlowski-it.de: ' + (chosen?.value || ''),
    );
    window.location.href =
      'mailto:pk@kozlowski-it.de?subject=' + subject +
      '&body=' + encodeURIComponent(text);

    // mailto can fail silently (webmail, unconfigured client) — show a fallback
    // so a filled-out request never gets lost without the visitor noticing.
    showFallback(text);
  });

  function showFallback(text) {
    status.classList.add('is-fallback');
    status.textContent = '';
    const msg = document.createElement('span');
    msg.textContent =
      form.dataset.fallbackText ||
      'Ihr E-Mail-Programm sollte sich öffnen. Falls nicht: Text kopieren und an pk@kozlowski-it.de schicken oder 0162 8213267 anrufen.';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-btn';
    copy.textContent = form.dataset.copyLabel || 'Text kopieren';
    copy.addEventListener('click', () => {
      navigator.clipboard?.writeText('An: pk@kozlowski-it.de\n\n' + text).then(
        () => { copy.textContent = form.dataset.copiedLabel || 'Kopiert ✓'; },
        () => { copy.textContent = 'pk@kozlowski-it.de'; },
      );
    });
    status.append(msg, document.createElement('br'), copy);
  }
})();

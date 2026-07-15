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
    const artEl = form.elements.namedItem('art');
    const artVal = artEl && !artEl.disabled ? (artEl.value || '').toString().trim() : '';
    const lines = [];
    for (const el of form.elements) {
      if (!el.name || el.disabled || el.type === 'radio' || el.type === 'submit') {
        continue;
      }
      const label = el.dataset.label || el.name;
      lines.push(label + ': ' + ((el.value || '').toString().trim() || '–'));
    }
    const text = lines.join('\n');
    const subject = encodeURIComponent(
      'Anfrage über kozlowski-it.de' + (artVal ? ': ' + artVal : ''),
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

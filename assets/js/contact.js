// Interim contact handler: switches the request-type branch, validates, and
// builds a structured, pre-filled email from the active fields. No backend,
// no third-party service — data goes straight to pk@kozlowski-it.de. Swap the
// mailto for a POST to a self-hosted endpoint once the backend is in place.
(function () {
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
    const subject = encodeURIComponent(
      'Anfrage über kozlowski-it.de: ' + (chosen?.value || ''),
    );
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href =
      'mailto:pk@kozlowski-it.de?subject=' + subject + '&body=' + body;
  });
})();

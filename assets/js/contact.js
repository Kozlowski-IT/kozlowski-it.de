// Interim contact handler: builds a pre-filled email from the form fields and
// opens the visitor's mail client. No backend, no third-party service — data
// goes straight from the visitor to pk@kozlowski-it.de. Swap the submit body
// for a POST to a self-hosted endpoint once the backend is in place.
(function () {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const status = form.querySelector('.form-status');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const value = (key) => (data.get(key) || '').toString().trim();

    const email = value('email');
    const phone = value('telefon');
    if (!email && !phone) {
      status.textContent =
        form.dataset.contactError || 'Bitte E-Mail oder Telefon angeben.';
      return;
    }
    status.textContent = '';

    const lines = [
      'Name: ' + value('name'),
      'Firma: ' + (value('firma') || '–'),
      'E-Mail: ' + (email || '–'),
      'Telefon: ' + (phone || '–'),
      'Thema: ' + value('thema'),
      '',
      value('nachricht'),
    ];
    const subject = encodeURIComponent(
      'Anfrage über kozlowski-it.de: ' + value('thema'),
    );
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href =
      'mailto:pk@kozlowski-it.de?subject=' + subject + '&body=' + body;
  });
})();

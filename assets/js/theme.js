// theme toggle — defaults to the visitor's system preference, remembers choice
(function () {
  const stored = localStorage.getItem('pk.theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  let theme = stored || system;

  const apply = () => {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
  };
  apply();

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.getElementById('theme-toggle').addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pk.theme', theme);
      apply();
    });
  });
})();

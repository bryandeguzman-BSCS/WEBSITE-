/* Runs before CSS/first paint. Only appearance preferences are stored here. */
(() => {
  const key = 'edunexus-appearance';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { const saved = localStorage.getItem(key); if (['light','dark','system'].includes(saved)) preference = saved; } catch {}
  function apply() {
    const effective = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
    window.dispatchEvent(new CustomEvent('edunexus-theme', {detail:{preference,effective}}));
  }
  window.EdunexusTheme = {
    get: () => preference,
    set(value) {
      if (!['light','dark','system'].includes(value)) return;
      preference = value;
      try { localStorage.setItem(key, value); } catch {}
      apply();
    }
  };
  if (system.addEventListener) system.addEventListener('change', () => { if (preference === 'system') apply(); });
  else system.addListener(() => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key) { preference = ['light','dark','system'].includes(event.newValue) ? event.newValue : 'system'; apply(); }
  });
  apply();
})();

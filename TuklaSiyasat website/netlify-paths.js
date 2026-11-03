/* Netlify clean-path aliases enter the existing guarded hash router. */
(() => {
  'use strict';
  const path = location.pathname;
  // The dedicated callback document handles PKCE itself and never loads this file.
  if (path === '/' || path === '/index.html' || path === '/auth-callback.html') return;
  let requested;
  try { requested = '#' + decodeURIComponent(path).replace(/^\/+|\/+$/g, ''); }
  catch { requested = '#home'; }
  const allowed = hash => window.EdunexusAuthRoute.isPublic(hash) ? hash : window.EdunexusAuthRoute.safe(hash);
  const currentHash = allowed(location.hash);
  const route = currentHash || allowed(requested) || '#home';
  // Local URL only. Retain query parameters; never read or change Auth storage.
  history.replaceState(null, '', '/' + location.search + route);
})();

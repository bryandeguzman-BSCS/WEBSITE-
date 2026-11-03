/* Single Supabase client shared by the application and dedicated PKCE callback page. */
window.EdunexusAuthClient = (() => {
  const SESSION_KEY = 'edunexus-supabase-auth';
  const REMEMBER_KEY = 'edunexus-remember-session';
  let instance = null;
  function remember(value) { localStorage.setItem(REMEMBER_KEY, value ? 'yes' : 'no'); }
  // PKCE verifier survives opening an email link in another tab of the same browser.
  // Supabase session tokens go to sessionStorage unless Remember Me was selected.
  const storage = {
    getItem(key) { return sessionStorage.getItem(key) ?? localStorage.getItem(key); },
    setItem(key, value) {
      const persistent = key.includes('code-verifier') || localStorage.getItem(REMEMBER_KEY) === 'yes';
      (persistent ? localStorage : sessionStorage).setItem(key, value);
      (persistent ? sessionStorage : localStorage).removeItem(key);
    },
    removeItem(key) { sessionStorage.removeItem(key); localStorage.removeItem(key); }
  };
  function configured() {
    const c = window.EDUNEXUS_AUTH_CONFIG || {};
    // Accept only a public publishable key or legacy anon JWT; reject privileged keys.
    let validKey = typeof c.supabasePublishableKey === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(c.supabasePublishableKey);
    if (!validKey && c.supabasePublishableKey?.startsWith('eyJ')) {
      try {
        const payload = c.supabasePublishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
        validKey = JSON.parse(atob(payload)).role === 'anon';
      } catch {}
    }
    try { const url = new URL(c.supabaseUrl); return validKey && url.protocol === 'https:' && !url.username && !url.password && !!window.supabase?.createClient; }
    catch { return false; }
  }
  function get() {
    if (!configured()) return null;
    if (!instance) instance = supabase.createClient(EDUNEXUS_AUTH_CONFIG.supabaseUrl, EDUNEXUS_AUTH_CONFIG.supabasePublishableKey, {
      auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true,storageKey:SESSION_KEY,storage}
    });
    return instance;
  }
  function clear() {
    [localStorage, sessionStorage].forEach(store => {
      for (let i=store.length-1;i>=0;i--) { const key=store.key(i); if (key?.startsWith(SESSION_KEY)) store.removeItem(key); }
    });
  }
  return {get, configured, remember, clear};
})();

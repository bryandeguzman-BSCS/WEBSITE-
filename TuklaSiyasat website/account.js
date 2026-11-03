window.EdunexusAccount = (() => {
  'use strict';
  const routes = new Set(['#login','#register','#forgot-password','#reset-password','#profile','#account','#appearance']);
  const protectedRoutes = new Set(['#profile','#account','#reset-password']);
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
  let user = null, busy = false, routeVersion = 0, flash = '', returnTo = '#home';
  let client = null;
  try { client = EdunexusAuthClient.get(); } catch {}
  const ready = (async () => {
    if (!client) return;
    try { const {data,error} = await client.auth.getUser(); if (!error) user = data?.user || null; } catch {}
    updateMenu();
  })();
  if (client) client.auth.onAuthStateChange((event, session) => {
    // Do not await other SDK methods from inside its auth-state lock.
    setTimeout(() => {
      if (event === 'SIGNED_OUT') user = null;
      else if (session?.user) user = session.user;
      updateMenu();
      if (!busy) window.dispatchEvent(new CustomEvent('edunexus-refresh-view'));
    }, 0);
  });
  function updateMenu(){const menu=$('account-menu');if(menu){menu.innerHTML='';menu.hidden=true;}}
  function notice() {
    return client ? '' : '<div class="account-notice" role="status">Hindi pa aktibo ang pagpasok at pagpaparehistro. Kailangang i-configure muna ang Supabase Auth ng tagapangasiwa.</div>';
  }
  function passwordField(id, label, confirm = false) {
    return `<label for="${id}">${label}</label><div class="password-field"><input id="${id}" name="${id}" type="password" required autocomplete="${confirm ? 'new-password' : id === 'login-password' ? 'current-password' : 'new-password'}" maxlength="128"><button type="button" data-account="toggle-password" data-for="${id}" aria-label="Ipakita ang password" aria-pressed="false">${icon('eye')}</button></div>`;
  }
  function formPage(title, description, content) {
    $('app').innerHTML = `<section class="account-wrap"><article class="account-card"><div class="account-brand"><img src="logo.svg" width="44" height="44" alt="TuklaSiyasat"><span>TuklaSiyasat <b>FILIPINO</b><small>Matuto. Unawain. Iugnay.</small></span></div><h1>${title}</h1><p class="account-lead">${description}</p>${notice()}<div id="account-message" class="account-message" role="status" aria-live="polite">${esc(flash)}</div>${content}${user ? '<a class="account-home" href="#home">← Bumalik sa Tahanan</a>' : ''}</article></section>`;
  }
  function login() {
    formPage('Maligayang pagbabalik', 'Pumasok upang makita at pamahalaan ang iyong account.', `<form id="login-form" data-form="login" novalidate><label for="login-email">Email address</label><input id="login-email" type="email" name="email" required autocomplete="email" maxlength="254" placeholder="pangalan@halimbawa.com">${passwordField('login-password','Password')}<div class="login-options"><label class="check-label"><input id="remember" type="checkbox"> Tandaan ako</label><a href="#forgot-password">Nakalimutan ang password?</a></div><button class="btn gold account-submit" type="submit">Pumasok ${icon('arrow-right')}</button></form><p class="account-footer">Wala ka pang account? <a href="#register">Gumawa ng Account</a></p>`);
  }
  function register() {
    formPage('Gumawa ng account', 'Simulan ang iyong paglalakbay sa pagkatuto.', `<form data-form="register" novalidate><label for="full-name">Buong pangalan</label><input id="full-name" name="full-name" required autocomplete="name" maxlength="100"><label for="register-email">Email address</label><input id="register-email" type="email" required autocomplete="email" maxlength="254">${passwordField('register-password','Password')}<p class="password-hint">Gumamit ng 12–128 na karakter, na may malaking titik, maliit na titik, at numero.</p>${passwordField('confirm-password','Ulitin ang password',true)}<button class="btn gold account-submit" type="submit">Gumawa ng Account</button></form><p class="account-footer">May account ka na? <a href="#login">Pumasok</a></p>`);
  }
  function forgot() {
    formPage('Nakalimutan ang password?', 'Ilagay ang email ng account upang humiling ng ligtas na link para palitan ang password.', `<form data-form="forgot" novalidate><label for="reset-email">Email address</label><input id="reset-email" type="email" required autocomplete="email" maxlength="254"><button class="btn gold account-submit" type="submit">Ipadala ang Link</button></form><p class="account-footer"><a href="#login">Bumalik sa Pagpasok</a></p>`);
  }
  function reset() {
    formPage('Bagong password', 'Magtakda ng bagong password para sa iyong napatunayang account.', `<form data-form="reset" novalidate>${passwordField('new-password','Bagong password')}<p class="password-hint">12–128 na karakter; may malaking titik, maliit na titik, at numero.</p>${passwordField('confirm-password','Ulitin ang bagong password',true)}<button class="btn gold account-submit" type="submit">I-save ang Bagong Password</button></form>`);
  }
  function profile(accountSettings = false) {
    const name = typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim() ? user.user_metadata.full_name : 'Mag-aaral';
    formPage(accountSettings ? 'Mga Setting ng Account' : 'Aking Profile', 'Ang impormasyong ito ay mula sa iyong napatunayang account sa Supabase.', `<div class="profile-summary"><span class="profile-avatar">${esc(name.trim().charAt(0).toUpperCase())}</span><div><strong>${esc(name)}</strong><p>${esc(user?.email)}</p></div></div><form data-form="profile" novalidate><label for="profile-name">Buong pangalan</label><input id="profile-name" value="${esc(name)}" autocomplete="name" required maxlength="100"><label for="profile-email">Email address</label><input id="profile-email" type="email" value="${esc(user?.email)}" readonly><button class="btn gold account-submit" type="submit">I-save ang Pangalan</button></form>${accountSettings ? `<div class="account-settings-links"><a href="#appearance">${icon('circle-half-stroke')} Baguhin ang Hitsura ${icon('chevron-right')}</a><a href="#forgot-password">${icon('key')} Palitan ang Password ${icon('chevron-right')}</a><button type="button" data-account="logout">${icon('right-from-bracket')} Lumabas sa Account</button></div>` : '<p class="account-footer"><a href="#account">Mga Setting ng Account</a></p>'}`);
  }
  function appearance() {
    const value = EdunexusTheme.get();
    $('app').innerHTML = `<section class="appearance-wrap"><a class="appearance-back" href="${user ? '#account' : '#home'}">${icon('arrow-left')} Bumalik</a><h1>Hitsura</h1><p>Piliin ang anyo ng TuklaSiyasat sa iyong aparato.</p><fieldset class="appearance-options"><legend class="sr-only">Pumili ng hitsura</legend>${[
      ['light','Naka-off','Maliwanag na anyo'],['dark','Naka-on','Madilim na anyo'],['system','Sistema','Sundin ang hitsura ng aparato']
    ].map(([option,label,detail]) => `<label class="appearance-option"><span><strong>${label}</strong><small>${detail}</small></span><input type="radio" name="appearance" value="${option}" ${value === option ? 'checked' : ''}></label>`).join('')}</fieldset><p class="appearance-help" id="appearance-status" role="status">Awtomatikong nase-save sa browser na ito ang iyong pinili.</p></section>`;
  }
  async function render(hash) {
    if (!routes.has(hash)) return false;
    const version = ++routeVersion;
    if ($('account-menu')) $('account-menu').hidden = true;
    $('account-button')?.setAttribute('aria-expanded','false');
    if (hash === '#appearance') { user=window.EdunexusAccess?.user()||null; appearance(); return true; }
    if (protectedRoutes.has(hash)) {
      $('app').innerHTML = '<section class="account-wrap"><p role="status">Sinusuri ang iyong account…</p></section>';
      await ready;
      if (version !== routeVersion || location.hash !== hash) return true;
      let verified = null;
      if (client) {
        try { const {data,error} = await client.auth.getUser(); if (!error) verified = data?.user || null; } catch {}
      }
      if (version !== routeVersion || location.hash !== hash) return true;
      user = verified; updateMenu();
      if (!user) { returnTo = hash; flash = client ? 'Pumasok muna upang makita ang pahinang ito.' : 'Hindi pa naka-configure ang pagpapatunay ng account.'; location.hash = '#login'; return true; }
    }
    if (hash === '#login') login();
    else if (hash === '#register') register();
    else if (hash === '#forgot-password') forgot();
    else if (hash === '#reset-password') reset();
    else profile(hash === '#account');
    return true;
  }
  function message(text, error = false) {
    const el = $('account-message');
    if (!el) {
      const toast = $('toast');
      if (toast) { toast.textContent = text; toast.style.display = 'block'; setTimeout(() => { toast.style.display = 'none'; }, 5000); }
      return;
    }
    el.textContent = text; el.classList.toggle('is-error',error);
    el.setAttribute('role',error ? 'alert' : 'status');
  }
  function email(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
  function password(value) { return value.length >= 12 && value.length <= 128 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value); }
  function providerError(error) {
    const code = error?.code || '';
    if (code === 'invalid_credentials') return 'Hindi tama ang email o password. Subukang muli.';
    if (code === 'email_not_confirmed') return 'Kumpirmahin muna ang email gamit ang link na ipinadala sa iyo.';
    if (['user_already_exists','email_exists'].includes(code)) return 'Maaaring may account na ang email na ito. Subukang pumasok o magpalit ng password.';
    if (code === 'weak_password') return 'Hindi pumasa sa patakaran ng seguridad ang password. Gumamit ng mas matibay na password.';
    if (code === 'same_password') return 'Gumamit ng password na iba sa kasalukuyan.';
    if (code === 'email_address_not_authorized') return 'Hindi pa handa ang serbisyo ng email para sa address na ito. Ipaayos sa tagapangasiwa ang SMTP configuration.';
    if (code === 'reauthentication_needed') return 'Kailangang muling patunayan ang account. Humiling ng bagong link sa pagpapalit ng password.';
    if (error?.status === 429 || /rate_limit/.test(code)) return 'Masyadong maraming pagsubok. Maghintay muna bago subukan muli.';
    if (['session_not_found','refresh_token_not_found','refresh_token_already_used'].includes(code)) return 'Paso na ang iyong sesyon. Pumasok muli o humiling ng bagong link.';
    return 'Hindi makumpleto ang kahilingan. Tingnan ang koneksiyon at subukang muli.';
  }
  function callback(mode) {
    // No user-provided redirect destinations. Production stays on the same Netlify site.
    const url=new URL('auth-callback.html',location.href.split('#')[0]);url.searchParams.set('mode',mode);url.searchParams.set('next',window.EdunexusAuthRoute?.pending()||'#home');return url.href;
  }
  async function submit(event) {
    const form = event.target.closest('form[data-form]'); if (!form) return;
    event.preventDefault(); if (busy) return;
    const kind = form.dataset.form;
    const name = (form.querySelector('#full-name, #profile-name')?.value || '').trim();
    const mail = (form.querySelector('input[type="email"]')?.value || '').trim();
    const pass = form.querySelector('#login-password, #register-password, #new-password')?.value || '';
    const confirm = form.querySelector('#confirm-password')?.value || '';
    if (['login','register','forgot'].includes(kind) && !email(mail)) return message('Maglagay ng wastong email address.',true);
    if (kind === 'login' && !pass) return message('Ilagay ang iyong password.',true);
    if (['register','profile'].includes(kind) && (name.length < 2 || name.length > 100)) return message('Maglagay ng buong pangalang may 2–100 na karakter.',true);
    if (['register','reset'].includes(kind)) {
      if (!password(pass)) return message('Kailangan ng 12–128 na karakter, malaking titik, maliit na titik, at numero sa password.',true);
      if (pass !== confirm) return message('Hindi magkatugma ang dalawang password.',true);
    }
    if (!client) return message('Hindi pa aktibo ang pagpapatunay. Kailangang i-configure muna ang Supabase Auth.',true);
    busy = true;
    const route = location.hash;
    form.querySelectorAll('button[type="submit"]').forEach(button => button.disabled = true);
    message('Pinoproseso ang iyong kahilingan…');
    try {
      if (kind === 'login') {
        EdunexusAuthClient.remember(form.querySelector('#remember').checked);
        const {data,error} = await client.auth.signInWithPassword({email:mail,password:pass});
        if (error) throw error;
        if (!data?.user || !data?.session) throw new Error('No authenticated session');
        user = data.user; updateMenu();
        if (location.hash === route) window.dispatchEvent(new CustomEvent('edunexus-refresh-view'));
        returnTo = '#home';
      } else if (kind === 'register') {
        EdunexusAuthClient.remember(false);
        const {data,error} = await client.auth.signUp({email:mail,password:pass,options:{data:{full_name:name},emailRedirectTo:callback('confirm')}});
        if (error) throw error;
        if (data?.session) { user = data.user; updateMenu(); if (location.hash === route) window.dispatchEvent(new CustomEvent('edunexus-refresh-view')); }
        else message('Kung maaaring gamitin ang email na ito, makatatanggap ka ng link sa pagpapatunay. Kung may account ka na, pumasok o humiling ng bagong password.');
      } else if (kind === 'forgot') {
        const {error} = await client.auth.resetPasswordForEmail(mail,{redirectTo:callback('recovery')});
        if (error) throw error;
        message('Kung may account ang email na ito, makatatanggap ito ng link para palitan ang password. Buksan ang link sa parehong browser.');
      } else if (kind === 'reset') {
        const {data:verified,error:verifyError} = await client.auth.getUser();
        if (verifyError || !verified?.user) throw {code:'session_not_found'};
        const {error} = await client.auth.updateUser({password:pass});
        if (error) throw error;
        await logout('Napalitan na ang password. Pumasok muli gamit ang bago mong password.');
      } else if (kind === 'profile') {
        const {data:verified,error:verifyError} = await client.auth.getUser();
        if (verifyError || !verified?.user) throw {code:'session_not_found'};
        const {data,error} = await client.auth.updateUser({data:{full_name:name}});
        if (error) throw error;
        user = data.user; updateMenu();
        if (location.hash === route) { profile(route === '#account'); message('Na-save na ang iyong pangalan.'); }
      }
    } catch (error) { if (location.hash === route) message(providerError(error),true); }
    finally {
      busy = false;
      form.querySelectorAll('.password-field input').forEach(input => {
        input.value = ''; input.type = 'password';
        const toggle = input.parentElement.querySelector('button');
        toggle.setAttribute('aria-pressed','false'); toggle.setAttribute('aria-label','Ipakita ang password'); toggle.innerHTML = icon('eye');
      });
      form.querySelectorAll('button[type="submit"]').forEach(button => button.disabled = false);
    }
  }
  async function logout(text = 'Nakalabas ka na sa iyong account.') {
    if (!client) return;
    const {error} = await client.auth.signOut({scope:'local'});
    if (error) { message('Hindi makalabas nang ligtas. Tingnan ang koneksiyon at subukang muli.',true); return; }
    EdunexusAuthClient.clear(); window.EdunexusAuthRoute?.clear(); window.EdunexusAccess?.signedOut(); user = null; flash = text; returnTo = '#home'; updateMenu();
    if (location.hash === '#login') login(); else location.hash = '#login';
  }
  document.addEventListener('submit', event => { void submit(event); });
  document.addEventListener('change', event => {
    if (event.target.matches('input[name="appearance"]')) {
      EdunexusTheme.set(event.target.value);
      if ($('appearance-status')) $('appearance-status').textContent = 'Na-save at nailapat na ang iyong piniling hitsura.';
    }
  });
  window.addEventListener('edunexus-theme', () => {
    document.querySelectorAll('input[name="appearance"]').forEach(input => { input.checked = input.value === EdunexusTheme.get(); });
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-account]');
    if (!button) return;
    if (button.dataset.account === 'menu') {
      updateMenu(); EdunexusNavigation.toggle('account-menu');
    } else if (button.dataset.account === 'toggle-password') {
      const field = $(button.dataset.for), visible = field.type === 'password'; field.type = visible ? 'text' : 'password';
      button.setAttribute('aria-pressed',String(visible)); button.setAttribute('aria-label',visible ? 'Itago ang password' : 'Ipakita ang password');
      button.innerHTML = icon(visible ? 'eye-slash' : 'eye');
    } else if (button.dataset.account === 'logout' && !busy) {
      busy = true; void logout().catch(() => message('Hindi makalabas. Subukang muli.',true)).finally(() => { busy = false; });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('account-menu')) { $('account-menu').hidden = true; $('account-button')?.setAttribute('aria-expanded','false'); }
  });
  window.addEventListener('hashchange', () => {
    routeVersion++;
    if(location.hash!=='#login')flash='';
    if ($('account-menu')) $('account-menu').hidden = true;
    $('account-button')?.setAttribute('aria-expanded','false');
  });
  window.addEventListener('edunexus-catalog',()=>updateMenu());
  window.addEventListener('edunexus-verified',event=>{user=event.detail.user;updateMenu();});
  updateMenu();
  return {render, handles:hash=>routes.has(hash), publicRoute:hash=>['#login','#register','#forgot-password'].includes(hash)};
})();

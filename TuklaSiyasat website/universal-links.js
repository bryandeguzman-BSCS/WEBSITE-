/* TuklaSiyasat public links and QR tools. Camera/image decoding stays in this browser. */
window.EdunexusLinks = (() => {
  'use strict';
  // Use the site that is actually open; the verified public deployment is the local-preview fallback.
  const DEFAULT_PUBLIC_BASE = 'https://visionary-zabaione-5d5b8a.netlify.app/';
  const localHost = host => host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '[::1]' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '0.0.0.0' || /^169\.254\./.test(host);
  const PUBLIC_BASE = location.protocol === 'https:' && !localHost(location.hostname.toLowerCase()) ? location.origin + '/' : DEFAULT_PUBLIC_BASE;
  const knownOrigins = new Set([new URL(PUBLIC_BASE).origin, 'https://tiny-fox-5863f3.netlify.app', 'https://visionary-zabaione-5d5b8a.netlify.app']);
  const retiredRoutes = new Set(['#login','#logout','#register','#forgot-password','#reset-password','#profile','#account']);
  const allowedRoutes = new Set(['#home', '#links', '#glossary', '#subjects', '#module/101', '#module/102']);
  let qrCanvas = null, generatedUrl = '', generatedRoute = '#home', pendingRoute = null;
  let reader = null, startTask = null, stopTask = null, fileTask = null;
  let epoch = 0, handled = false, lastResult = null;
  const $ = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const icon = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

  function register(modules) {
    allowedRoutes.clear();['#home','#links','#glossary','#subjects'].forEach(route=>allowedRoutes.add(route));
    if(window.EdunexusSubjects){EdunexusSubjects.publicRoutes().forEach(route=>allowedRoutes.add(route));return;}
    for (const [moduleId, module] of Object.entries(modules)) {
      allowedRoutes.add(`#module/${moduleId}`);
      module.lessons.forEach((_, i) => allowedRoutes.add(`#lesson/${moduleId}/${i}`));
    }
  }
  function normalizeRoute(hash) {
    if(retiredRoutes.has(hash))return '#home';
    // Imported module links and legacy lesson links must resolve to the same published lesson.
    const imported=/^#learn\/ge(10[12])-doc-m([1-7])$/.exec(hash);
    if(imported){const route=`#lesson/${imported[1]}/${Number(imported[2])-1}`;return allowedRoutes.has(route)?route:null;}
    const alias=/^#lesson\/(ge(10[12])-l([0-6]))$/.exec(hash);
    if(alias)hash=`#lesson/${alias[2]}/${alias[3]}`;
    if(/^#assessment\//.test(hash)&&window.EdunexusAuthRoute?.safe(hash))return hash;
    return hash === '' || hash === '#' ? '#home' : allowedRoutes.has(hash) ? hash : null;
  }
  function publicUrl(hash = location.hash) {
    const route = normalizeRoute(hash) || (window.EdunexusAccount?.handles(hash)||window.EdunexusLMS?.handles(hash) ? '#home' : null);
    if (!route) throw new Error('Hindi wasto ang destinasyon ng link.');
    return PUBLIC_BASE + route;
  }
  function classify(text) {
    if (typeof text !== 'string' || text.trim().length > 4096) return {kind:'invalid', reason:'Hindi wastong link ang laman ng QR code.'};
    let url;
    try { url = new URL(text.trim()); } catch { return {kind:'invalid', reason:'Walang wastong web URL ang QR code.'}; }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
      return {kind:'invalid', reason:'Hindi pinapayagan ang ganitong uri ng link.'};
    }
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '[::1]' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '0.0.0.0' || /^169\.254\./.test(host)) {
      return {kind:'invalid', reason:'Lokal o pribadong address ito. Gumamit ng pampublikong HTTPS link.'};
    }
    if (knownOrigins.has(url.origin)) {
      let pathRoute='';
      try{pathRoute=['/','/index.html'].includes(url.pathname)?'':'#'+decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g,'');}catch{return {kind:'invalid',reason:'Hindi wastong path ang link.'};}
      const route = normalizeRoute(url.hash || pathRoute);
      if (!route || url.search) {
        return {kind:'invalid', reason:'Hindi kilalang TuklaSiyasat na pahina o aralin ang link na ito.'};
      }
      return {kind:'internal', url:publicUrl(route), route};
    }
    // Never automatically open another origin, including look-alike domains.
    return {kind:'external', url:url.href, host:url.host};
  }
  function status(text, error = false) {
    const el = $('qr-status');
    if (el) { el.textContent = text; el.classList.toggle('is-error', error); }
  }
  function scannerStatus(text, error = false) {
    const el = $('qr-scan-status');
    if (el) { el.textContent = text; el.classList.toggle('is-error', error); }
  }
  async function copyUrl(url) {
    try { await navigator.clipboard.writeText(url); status('Nakopya na ang pampublikong link.'); }
    catch {
      const field = $('generated');
      if (field) { field.focus(); field.select(); }
      status('Hindi makopya nang awtomatiko. Piliin at kopyahin ang link sa kahon.');
    }
  }
  async function shareUrl(url) {
    if (!navigator.share) return copyUrl(url);
    try { await navigator.share({title:'TuklaSiyasat Filipino', url}); }
    catch (error) { if (error.name !== 'AbortError') await copyUrl(url); }
  }
  function generate() {
    const container = $('qr-code');
    if (!container) return;
    qrCanvas = null;
    $('qr-download').disabled = true;
    try {
      generatedRoute = $('destination').value;
      generatedUrl = publicUrl(generatedRoute);
      $('generated').value = generatedUrl;
      $('open-generated').href = generatedUrl;
      container.replaceChildren();
      if (!window.QRCode) throw new Error('Hindi nabuksan ang panggawa ng QR code. I-reload ang pahina.');
      // QRCode.js selects the version; integer-sized modules plus four-module quiet zone
      // preserve sharp edges both on screen and in the downloaded PNG.
      const scratch = document.createElement('div');
      const code = new QRCode(scratch, {text:generatedUrl, width:256, height:256, correctLevel:QRCode.CorrectLevel.M});
      const matrix = code._oQRCode;
      const count = matrix.getModuleCount(), moduleSize = 10, quiet = 4;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = (count + quiet * 2) * moduleSize;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) {
        if (matrix.isDark(row, col)) ctx.fillRect((col + quiet) * moduleSize, (row + quiet) * moduleSize, moduleSize, moduleSize);
      }
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `QR code para sa ${$('destination').selectedOptions[0].textContent}`);
      container.append(canvas); qrCanvas = canvas;
      $('qr-download').disabled = false;
      status('Handa na ang QR code. Bubukas ang napiling public page nang walang login.');
    } catch (error) { container.textContent = error.message; status(error.message, true); }
  }
  function download() {
    if (!qrCanvas) return status('Gumawa muna ng QR code.', true);
    qrCanvas.toBlob(blob => {
      if (!blob) return status('Hindi ma-download ang larawan ng QR. Subukang muli.', true);
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `tuklasiyasat-${generatedRoute.slice(1).replaceAll('/', '-')}.png`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      status('Na-download ang QR code bilang PNG.');
    }, 'image/png');
  }
  function ensureScannerDialog() {
    if ($('qr-scanner-dialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'qr-scanner-dialog'; dialog.className = 'qr-scanner-dialog';
    dialog.setAttribute('aria-labelledby', 'qr-scanner-title');
    dialog.innerHTML = `<div class="qr-scanner-heading"><h2 id="qr-scanner-title">${icon('camera')} Mag-scan ng QR Code</h2><button type="button" class="qr-icon-button" data-qr="close" aria-label="Isara ang Pang-scan">${icon('xmark')}</button></div>
      <p>Itapat ang QR code sa kamera. Sa iyong aparato lamang pinoproseso ang kuha ng kamera at larawan.</p>
      <div id="qr-reader" class="qr-reader"></div><p id="qr-scan-status" class="qr-status" role="status" aria-live="polite"></p>
      <div id="qr-camera-controls" hidden><label for="qr-camera">Kamera</label><select id="qr-camera" aria-label="Pumili ng kamera"></select><button class="btn ghost" type="button" id="qr-switch" data-qr="switch">${icon('rotate')} Palitan ang Kamera</button></div>
      <div id="qr-scan-result" class="qr-result" hidden></div>
      <div class="actions"><button type="button" class="btn gold" data-qr="restart">${icon('camera')} Mag-scan Muli</button><button type="button" class="btn ghost" data-qr="close">${icon('stop')} Ihinto at Isara ang Pag-scan</button></div>`;
    document.body.append(dialog);
    dialog.addEventListener('cancel', () => { void stop(); });
    dialog.addEventListener('close', () => { void stop(); });
  }
  function controlsDisabled(value) {
    ['qr-camera', 'qr-switch'].forEach(id => { if ($(id)) $(id).disabled = value; });
  }
  async function dispose(instance) {
    if (!instance) return;
    try { if (instance.isScanning) await instance.stop(); } catch {}
    // Also release tracks if the decoder's stop rejects or a start was cancelled.
    document.querySelectorAll('#qr-reader video').forEach(video => {
      if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    });
    try { instance.clear(); } catch {}
  }
  async function stop() {
    epoch++;
    controlsDisabled(true);
    if (stopTask) return stopTask;
    stopTask = (async () => {
      try { if (startTask) await startTask; } catch {}
      try { if (fileTask) await fileTask; } catch {}
      const old = reader; reader = null;
      await dispose(old);
    })();
    try { await stopTask; } finally { stopTask = null; }
  }
  function cameraError(error) {
    const value = `${error?.name || ''} ${error?.message || error || ''}`;
    if (/NotAllowed|Permission|denied/i.test(value)) return 'Hindi pinayagan ang kamera. Payagan ang kamera sa mga setting ng browser, o gamitin ang Mag-upload ng Larawan ng QR.';
    if (/NotFound|DevicesNotFound|no cameras/i.test(value)) return 'Walang magagamit na kamera. Maaari kang mag-upload ng larawan ng QR.';
    if (/NotReadable|TrackStart|in use/i.test(value)) return 'Hindi mabuksan ang kamera. Isara ang ibang aplikasyon na gumagamit nito at subukang muli.';
    if (/Overconstrained/i.test(value)) return 'Hindi magamit ang napiling kamera. Pumili ng ibang kamera o mag-upload ng larawan ng QR.';
    return 'Hindi masimulan ang kamera. Gumamit ng HTTPS, tingnan ang mga pahintulot ng browser, o mag-upload ng larawan ng QR.';
  }
  async function cameras() {
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
      if (!reader?.isScanning || !$('qr-scanner-dialog').open) return;
      const active = reader.getRunningTrackSettings().deviceId;
      $('qr-camera').innerHTML = devices.map((d, i) => `<option value="${escape(d.deviceId)}">${escape(`Kamera ${i + 1}${/back|rear|environment/i.test(d.label) ? ' (likod)' : /front|user/i.test(d.label) ? ' (harap)' : ''}`)}</option>`).join('');
      if (active) $('qr-camera').value = active;
      $('qr-camera-controls').hidden = devices.length < 2;
      controlsDisabled(false);
    } catch { $('qr-camera-controls').hidden = true; }
  }
  async function startCamera(cameraId) {
    if (startTask || stopTask || fileTask || reader?.isScanning) return;
    if (location.hash !== '#links') return;
    ensureScannerDialog();
    const dialog = $('qr-scanner-dialog');
    if (!dialog.open) dialog.showModal();
    $('qr-scan-result').hidden = true; $('qr-scan-result').replaceChildren(); $('qr-camera-controls').hidden = true;
    handled = false;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      return scannerStatus('Hindi magamit ang kamera sa browser na ito. Buksan ang HTTPS na pahina o gamitin ang Mag-upload ng Larawan ng QR.', true);
    }
    if (!window.Html5Qrcode) return scannerStatus('Hindi nabuksan ang pang-scan ng QR code. I-reload ang pahina.', true);
    if (reader) { const old = reader; reader = null; await dispose(old); }
    const token = ++epoch;
    scannerStatus('Humihingi ng pahintulot sa kamera…');
    const instance = reader = new Html5Qrcode('qr-reader', {formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE], verbose:false});
    startTask = (async () => {
      try {
        await instance.start(cameraId ? {deviceId:{exact:cameraId}} : {facingMode:'environment'}, {fps:10, qrbox:(w,h) => { const size = Math.floor(Math.min(w,h) * .72); return {width:size,height:size}; }}, text => {
          if (!handled && token === epoch && dialog.open) { handled = true; void decoded(text, true); }
        }, () => {});
        if (token !== epoch || !dialog.open || location.hash !== '#links') await dispose(instance);
        else { scannerStatus('Gumagana na ang kamera. Itapat ang QR code sa loob ng kahon.'); await cameras(); }
      } catch (error) {
        await dispose(instance);
        if (reader === instance) reader = null;
        if (token === epoch && dialog.open) scannerStatus(cameraError(error), true);
      }
    })();
    try { await startTask; } finally { startTask = null; }
  }
  async function switchCamera() {
    if (startTask || stopTask || fileTask || !reader?.isScanning) return;
    const select = $('qr-camera');
    if (select.options.length < 2) return;
    select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
    const id = select.value;
    await stop();
    if ($('qr-scanner-dialog').open && location.hash === '#links') await startCamera(id);
  }
  async function chooseCamera() {
    const id = $('qr-camera').value;
    if (startTask || stopTask || fileTask) return;
    await stop();
    if ($('qr-scanner-dialog').open && location.hash === '#links') await startCamera(id);
  }
  async function decoded(text, automatic) {
    await stop();
    if (!$('qr-scanner-dialog')?.open || location.hash !== '#links') return;
    lastResult = classify(text);
    const result = $('qr-scan-result'); result.hidden = false;
    result.replaceChildren();
    const label = document.createElement('strong'); label.textContent = 'Nabasang Destinasyon';
    const value = document.createElement('p'); value.className = 'qr-decoded-link'; value.textContent = text;
    result.append(label, value);
    if (lastResult.kind === 'invalid') return scannerStatus(lastResult.reason, true);
    if (lastResult.kind === 'external') {
      scannerStatus(`Panlabas na pahina: ${lastResult.host}. Suriin ang address bago buksan.`);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn gold'; button.dataset.qr = 'external'; button.textContent = 'Kumpirmahin at Buksan ang Panlabas na Pahina'; result.append(button);
    } else {
      scannerStatus('Nakilala ang TuklaSiyasat link. Nakahinto na ang kamera.');
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn gold'; button.dataset.qr = 'internal'; button.textContent = 'Buksan ang Pahina ng TuklaSiyasat'; result.append(button);
      status(`Na-scan: ${lastResult.url}`);
      if (automatic) navigateInternal(lastResult);
    }
  }
  function navigateInternal(result) {
    if (result?.kind !== 'internal') return;
    $('qr-scanner-dialog')?.close();
    // The local preview uses the same router; production remains on the public origin.
    location.hash = result.route;
  }
  async function upload(file) {
    if (!file) return;
    if (fileTask || startTask || stopTask) return status('Sandali lamang, tinatapos pa ang kasalukuyang pag-scan.', true);
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) return status('Larawang PNG, JPG, JPEG, o WebP ang kailangan.', true);
    if (file.size > 20 * 1024 * 1024) return status('Masyadong malaki ang larawan. Gumamit ng talaksang na 20 MB o mas maliit.', true);
    await stop();
    if (location.hash !== '#links') return;
    ensureScannerDialog();
    const dialog = $('qr-scanner-dialog'); if (!dialog.open) dialog.showModal();
    $('qr-scan-result').hidden = true; $('qr-scan-result').replaceChildren(); $('qr-camera-controls').hidden = true;
    scannerStatus('Binabasa ang larawan ng QR…');
    const token = ++epoch;
    if (!window.Html5Qrcode) return scannerStatus('Hindi nabuksan ang pang-scan ng QR code. I-reload ang pahina.', true);
    const instance = reader = new Html5Qrcode('qr-reader', {formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE], verbose:false});
    let text;
    fileTask = instance.scanFile(file, true);
    try { text = await fileTask; }
    catch {
      if (token === epoch && dialog.open) scannerStatus('Walang mabasang QR code sa larawang ito. Gumamit ng malinaw at buong larawan ng QR.', true);
    } finally { fileTask = null; }
    if (text && token === epoch && dialog.open) await decoded(text, false);
  }
  function render(modules) {
    register(modules);
    document.getElementById('app').innerHTML = `<section class="wrap qr-page"><span class="eyebrow">Ibahagi ang pagkatuto</span><h1>Mga Link at QR Code</h1><p>Gumawa, mag-scan, o mag-upload ng QR code para sa TuklaSiyasat.</p>
      <article class="content qr-hub"><div class="qr-form"><label for="destination">Pumili ng destinasyon</label><select id="destination"><option value="#home">Tahanan</option>${window.EdunexusSubjects?'<option value="#subjects">Mga Asignatura</option>'+EdunexusSubjects.qrOptions():Object.entries(modules).map(([m,x]) => `<optgroup label="GE ${m}"><option value="#module/${m}">GE ${m} — ${escape(x.title)}</option>${x.lessons.map((l,i) => `<option value="#lesson/${m}/${i}">GE ${m} · ${i+1}. ${escape(l)}</option>`).join('')}</optgroup>`).join('')}<option value="#glossary">Bilingguwal na Glosaryo</option><option value="#links">Mga Link at QR Code</option></select>
      <label for="generated">Pampublikong Link na Maibabahagi</label><input id="generated" class="share-link" readonly aria-label="Pampublikong Link na Maibabahagi"><div class="actions"><button type="button" class="btn gold" data-qr="generate">${icon('qrcode')} Gumawa ng QR Code</button><button type="button" class="btn" data-qr="copy">${icon('copy')} Kopyahin ang Link</button><button type="button" class="btn ghost" data-qr="share">${icon('share-nodes')} Ibahagi</button><a id="open-generated" class="btn ghost">${icon('arrow-up-right-from-square')} Buksan ang Pahina</a></div><p id="qr-status" class="qr-status" role="status" aria-live="polite"></p></div>
      <div class="qr-preview"><div id="qr-code" class="qr-code"></div><button type="button" id="qr-download" class="btn gold" data-qr="download" disabled>${icon('download')} I-download ang QR Code (PNG)</button><small>Pampublikong HTTPS link · Nababasa ng mga karaniwang pang-scan ng QR</small></div></article>
      <article class="content qr-tools"><div><h2>${icon('camera')} May QR code ka na?</h2><p>I-scan gamit ang kamera o mag-upload ng larawan. Hindi gagamitin ang kamera hangga’t hindi mo pinipindot ang Mag-scan ng QR Code.</p></div><div class="actions"><button type="button" class="btn gold" data-qr="scan">${icon('camera')} Mag-scan ng QR Code</button><button type="button" class="btn" data-qr="upload">${icon('image')} Mag-upload ng Larawan ng QR</button><input id="qr-upload" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" hidden aria-label="Mag-upload ng Larawan ng QR"></div></article></section>`;
    $('destination').addEventListener('change', generate);
    $('qr-upload').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; void upload(file); });
    if(pendingRoute&&normalizeRoute(pendingRoute)){
      const destination=$('destination');
      if(![...destination.options].some(option=>option.value===pendingRoute)){
        const option=document.createElement('option');option.value=pendingRoute;option.textContent='Kasalukuyang Pagsusulit';destination.append(option);
      }
      destination.value=pendingRoute;
    }
    pendingRoute = null;
    generate();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-qr]'); if (!button) return;
    switch (button.dataset.qr) {
      case 'generate': generate(); break;
      case 'copy': void copyUrl(generatedUrl); break;
      case 'share': void shareUrl(generatedUrl); break;
      case 'download': download(); break;
      case 'scan': case 'restart': void startCamera(); break;
      case 'upload': $('qr-upload').click(); break;
      case 'close': void stop(); $('qr-scanner-dialog')?.close(); break;
      case 'switch': void switchCamera(); break;
      case 'internal': navigateInternal(lastResult); break;
      case 'external': {
        if (lastResult?.kind === 'external') { const url = lastResult.url; $('qr-scanner-dialog').close(); location.assign(url); }
        break;
      }
    }
  });
  document.addEventListener('change', event => { if (event.target.id === 'qr-camera') void chooseCamera(); });
  window.addEventListener('hashchange', () => { void stop(); $('qr-scanner-dialog')?.close(); });
  window.addEventListener('pagehide', () => { void stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { void stop(); $('qr-scanner-dialog')?.close(); } });
  function open(route) {
    pendingRoute = normalizeRoute(route) || '#home';
    location.hash = '#links';
  }
  return {register, render, publicUrl, classify, normalizeRoute, stop, open};
})();

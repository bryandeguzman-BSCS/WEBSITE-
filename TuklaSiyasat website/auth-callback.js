(async () => {
  const status = document.getElementById('callback-status');
  const params = new URLSearchParams(location.search);
  const code = params.get('code'), mode = params.get('mode');
  const hasError = params.has('error') || new URLSearchParams(location.hash.slice(1)).has('error');
  // Remove the one-time code before fetching/redirecting. Never log it or the session.
  history.replaceState(null, '', location.pathname);
  const client = EdunexusAuthClient.get();
  if (!client) { status.textContent = 'Hindi pa naka-configure ang Supabase Auth. Sundin muna ang gabay sa pag-setup.'; return; }
  if (!code || hasError) { status.textContent = 'Hindi wasto o paso na ang link. Humiling ng bagong email at buksan ito sa parehong browser na ginamit mo.'; return; }
  try {
    const {data,error} = await client.auth.exchangeCodeForSession(code);
    if (error || !data?.session) throw new Error('Invalid callback');
    const requested=EdunexusAuthRoute.safe(params.get('next'));
    const destination=mode==='recovery'?'#reset-password':(requested&&requested!=='#reset-password'?requested:EdunexusAuthRoute.pending());
    EdunexusAuthRoute.remember(destination);
    const {data:verified,error:verifyError}=await client.auth.getUser();
    if(verifyError||!verified?.user)throw new Error('Unverified session');
    location.replace('./'+destination);
  } catch {
    status.textContent = 'Hindi makumpleto ang pagpapatunay. Maaaring paso na ang link o ibang browser ang ginamit. Humiling ng bagong email.';
  }
})();

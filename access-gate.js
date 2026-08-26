/*
 * access-gate.js — verificación de sesión y permiso para una miniapp del portal.
 * Uso: incluir después del script UMD de supabase-js, con:
 *   <script src="access-gate.js" data-tool-slug="mi-miniapp"></script>
 * Requiere que el <head> tenga, antes de este script:
 *   <style>html.access-gate-hidden body { display: none; }</style>
 * para que el contenido nunca se vea antes de confirmar el acceso.
 */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://cnlmwlbdlmkifaqwpbak.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_6QLQ5KQo1RZf44DpnH3oyg_iaWEIg5W';
  var PANEL_URL = 'panel.html';

  var scriptTag = document.currentScript;
  var toolSlug = scriptTag ? scriptTag.getAttribute('data-tool-slug') : null;

  document.documentElement.classList.add('access-gate-hidden');

  function showBlockedMessage(text) {
    document.documentElement.innerHTML =
      '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
      '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
      'font-family:system-ui,sans-serif;background:#EEF1EE;color:#16202B;text-align:center;padding:24px;">' +
      '<div><p style="font-size:1.05rem;line-height:1.6;margin-bottom:20px;max-width:420px;">' + text + '</p>' +
      '<a href="' + PANEL_URL + '" style="color:#93641F;">Volver al portal</a></div></body>';
  }

  if (!toolSlug) {
    showBlockedMessage('Esta página no está configurada correctamente (falta el identificador de la miniapp). Avisa a quien administra el sitio.');
    return;
  }
  if (!window.supabase || !window.supabase.createClient) {
    showBlockedMessage('No se pudo cargar el sistema de acceso. Revisa tu conexión a internet e intenta de nuevo.');
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, storage: window.sessionStorage }
  });
  window.__accessGateClient = client;

  function revealContent() {
    document.documentElement.classList.remove('access-gate-hidden');
  }

  function goToLogin() {
    window.location.href = PANEL_URL + '?next=' + encodeURIComponent(window.location.pathname);
  }

  async function checkAccess() {
    var sessionRes = await client.auth.getSession();
    var session = sessionRes.data && sessionRes.data.session;
    if (!session) { goToLogin(); return; }

    var toolRes = await client.from('miniapps').select('id, es_libre').eq('slug', toolSlug).maybeSingle();
    if (toolRes.error || !toolRes.data) {
      showBlockedMessage('No se encontró esta herramienta en el sistema. Avisa a quien administra el sitio.');
      return;
    }
    if (toolRes.data.es_libre) { revealContent(); return; }

    var accessRes = await client
      .from('miniapp_acceso')
      .select('miniapp_id')
      .eq('miniapp_id', toolRes.data.id)
      .eq('usuario_id', session.user.id)
      .maybeSingle();

    if (accessRes.data) {
      revealContent();
    } else {
      showBlockedMessage('Tu cuenta no tiene acceso a esta herramienta. Si crees que es un error, contacta a quien administra tu cuenta.');
    }
  }

  checkAccess();
})();

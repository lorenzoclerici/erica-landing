/* ==========================================================================
   Consenso cookie (Consent Mode v2) + caricamento di Google Tag Manager
   - Prima di ogni scelta tutti gli storage pubblicitari/statistici sono "denied".
   - Con GTM_LOAD_BEFORE_CONSENT = false (default) GTM viene caricato solo dopo che l'utente ha
     concesso almeno una categoria: prima del consenso non parte nessun tag.
   - Se si usa un CMP esterno, impostare CONSENT_PROVIDER = 'external' e chiamare
     EricaConsent.set({ analytics: true|false, marketing: true|false }) dal callback del CMP.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.ERICA_CONFIG || {};
  var COOKIE = 'erica_consent';
  var isPlaceholder = function (v) { return !v || /^\{\{.*\}\}$/.test(String(v).trim()); };
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /\.(localhost|test)$/.test(location.hostname);
  var DEBUG = !!C.DEBUG || isLocal || /[?&]ericadebug=1/.test(location.search);

  window.dataLayer = window.dataLayer || [];
  window.EricaLog = function (label, data) {
    if (DEBUG && window.console) console.info('%c[Erica · ' + label + ']', 'color:#1E7A2E;font-weight:700', data);
  };
  window.EricaUtil = { isPlaceholder: isPlaceholder, isLocal: isLocal, debug: DEBUG };

  /* ---------- Cookie helpers (prima parte) ---------- */
  function setCookie(name, value, days) {
    var s = name + '=' + value + '; Max-Age=' + Math.round(days * 86400) + '; Path=/; SameSite=Lax';
    if (location.protocol === 'https:') s += '; Secure';
    document.cookie = s;
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
    return m ? m[1] : null;
  }
  function deleteCookie(name) {
    var host = location.hostname, parts = host.split('.'), domains = [undefined, host, '.' + host];
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    domains.forEach(function (d) {
      document.cookie = name + '=; Max-Age=0; Path=/' + (d ? '; Domain=' + d : '');
    });
  }
  function deleteCookiesMatching(re) {
    document.cookie.split('; ').forEach(function (c) {
      var n = c.split('=')[0];
      if (re.test(n)) deleteCookie(n);
    });
  }
  window.EricaCookies = { set: setCookie, get: getCookie, del: deleteCookie };

  /* ---------- Consent Mode v2: default "denied" ---------- */
  function gtag() {
    window.dataLayer.push(arguments);
    window.EricaLog('gtag', Array.prototype.slice.call(arguments));
  }
  window.gtag = window.gtag || gtag;

  var external = C.CONSENT_PROVIDER === 'external';
  if (!external) {
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted',
      wait_for_update: 500
    });
    gtag('set', 'ads_data_redaction', true);
  }

  /* ---------- Google Tag Manager ---------- */
  var gtmLoaded = false, warned = false;
  function loadGTM() {
    if (gtmLoaded) return;
    if (isPlaceholder(C.GTM_ID)) {
      if (!warned && window.console) { warned = true; console.warn('[Erica] GTM_ID non configurato in assets/js/config.js: Google Tag Manager non viene caricato.'); }
      return;
    }
    gtmLoaded = true;
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(C.GTM_ID);
    document.head.appendChild(s);
    window.EricaLog('GTM', 'caricamento di ' + C.GTM_ID);
  }

  /* ---------- Stato del consenso ---------- */
  var state = null;     // { analytics: bool, marketing: bool, v, ts } oppure null se l'utente non ha ancora scelto
  var listeners = [];

  function read() {
    var raw = getCookie(COOKIE);
    if (!raw) return null;
    try {
      var o = JSON.parse(decodeURIComponent(raw));
      return (o && o.v === C.CONSENT_VERSION) ? o : null;
    } catch (e) { return null; }
  }

  function apply(next, persist) {
    var prev = state;
    state = { analytics: !!next.analytics, marketing: !!next.marketing, v: C.CONSENT_VERSION, ts: new Date().toISOString() };
    if (persist) setCookie(COOKIE, encodeURIComponent(JSON.stringify(state)), C.CONSENT_COOKIE_DAYS || 180);

    var a = state.analytics ? 'granted' : 'denied', m = state.marketing ? 'granted' : 'denied';
    if (!external) {
      gtag('consent', 'update', { ad_storage: m, ad_user_data: m, ad_personalization: m, analytics_storage: a });
    }

    // Revoca: eliminazione dei cookie delle categorie non più consentite (best effort)
    if (prev && prev.analytics && !state.analytics) deleteCookiesMatching(/^(_ga|_gid|_gat)/);
    if (!state.marketing) { deleteCookie('erica_attr'); if (prev && prev.marketing) deleteCookiesMatching(/^(_gcl_|_gac_|FPLC)/); }

    if (state.analytics || state.marketing) loadGTM();

    window.EricaLog('consenso', state);
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { /* ignora */ } });
    document.dispatchEvent(new CustomEvent('erica:consent', { detail: state }));
  }

  /* ---------- Banner interno ---------- */
  var banner, lastFocus, built = false;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function build() {
    if (built) return;
    built = true;
    var cookieLink = isPlaceholder(C.COOKIE_URL)
      ? 'Cookie Policy'
      : '<a href="' + esc(C.COOKIE_URL) + '" target="_blank" rel="noopener">Cookie Policy</a>';

    banner = document.createElement('div');
    banner.className = 'cc';
    banner.hidden = true;
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cc-title');
    banner.setAttribute('aria-describedby', 'cc-desc');
    banner.innerHTML =
      '<h2 class="cc__title" id="cc-title" tabindex="-1">Cookie e privacy</h2>' +
      '<p id="cc-desc">Usiamo cookie tecnici, necessari al funzionamento della pagina. Con il vostro consenso usiamo anche cookie statistici e di marketing, anche di terze parti (per esempio Google), per misurare l’efficacia delle nostre campagne. Maggiori informazioni nella ' + cookieLink + '.</p>' +
      '<fieldset class="cc__prefs" hidden>' +
        '<legend class="sr-only">Preferenze cookie</legend>' +
        '<div class="cc__row"><div><strong>Necessari</strong><span>Servono al funzionamento della pagina e a ricordare la vostra scelta. Sempre attivi.</span></div>' +
          '<label class="sw"><input type="checkbox" checked disabled aria-label="Cookie necessari, sempre attivi"><i></i></label></div>' +
        '<div class="cc__row"><div><strong>Statistici</strong><span>Ci aiutano a capire come viene usata la pagina, in forma aggregata.</span></div>' +
          '<label class="sw"><input type="checkbox" data-cc="analytics" aria-label="Cookie statistici"><i></i></label></div>' +
        '<div class="cc__row"><div><strong>Marketing</strong><span>Permettono di misurare le conversioni delle campagne Google Ads e di mostrare annunci pertinenti.</span></div>' +
          '<label class="sw"><input type="checkbox" data-cc="marketing" aria-label="Cookie di marketing"><i></i></label></div>' +
      '</fieldset>' +
      '<div class="cc__actions" data-cc-main>' +
        '<button type="button" class="btn btn--blue" data-cc-act="reject">Rifiuta</button>' +
        '<button type="button" class="btn btn--blue" data-cc-act="accept">Accetta tutti</button>' +
        '<button type="button" class="btn btn--text" data-cc-act="custom">Personalizza</button>' +
      '</div>' +
      '<div class="cc__actions" data-cc-prefs hidden>' +
        '<button type="button" class="btn btn--blue" data-cc-act="save">Salva le preferenze</button>' +
        '<button type="button" class="btn btn--text" data-cc-act="back">Indietro</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cc-act]');
      if (!b) return;
      var act = b.getAttribute('data-cc-act');
      if (act === 'accept') decide({ analytics: true, marketing: true });
      else if (act === 'reject') decide({ analytics: false, marketing: false });
      else if (act === 'custom') showPrefs(true);
      else if (act === 'back') showPrefs(false);
      else if (act === 'save') decide({
        analytics: banner.querySelector('[data-cc="analytics"]').checked,
        marketing: banner.querySelector('[data-cc="marketing"]').checked
      });
    });
    banner.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state) closeBanner(); });
  }

  function showPrefs(on) {
    banner.querySelector('.cc__prefs').hidden = !on;
    banner.querySelector('[data-cc-main]').hidden = on;
    banner.querySelector('[data-cc-prefs]').hidden = !on;
    if (on) banner.querySelector('[data-cc="analytics"]').focus();
  }

  function decide(next) {
    apply(next, true);
    closeBanner();
  }

  function closeBanner() {
    if (!banner) return;
    banner.hidden = true;
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); lastFocus = null; }
  }

  function open(prefs) {
    if (external) { window.EricaLog('consenso', 'CMP esterno: aprire il pannello del CMP'); if (typeof window.EricaConsentOpenExternal === 'function') window.EricaConsentOpenExternal(); return; }
    build();
    lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    banner.querySelector('[data-cc="analytics"]').checked = !!(state && state.analytics);
    banner.querySelector('[data-cc="marketing"]').checked = !!(state && state.marketing);
    banner.hidden = false;
    showPrefs(!!prefs);
    if (prefs) return;
    if (lastFocus) banner.querySelector('#cc-title').focus();
  }

  /* ---------- API pubblica ---------- */
  window.EricaConsent = {
    get: function () { return state; },
    isAnalytics: function () { return !!(state && state.analytics); },
    isMarketing: function () { return !!(state && state.marketing); },
    hasAdUserData: function () { return !!(state && state.marketing); },   // ad_user_data segue la categoria marketing
    gtmLoaded: function () { return gtmLoaded; },
    open: open,
    set: function (next) { apply(next || {}, external ? false : true); },
    onChange: function (fn) { listeners.push(fn); }
  };

  /* ---------- Avvio ---------- */
  if (external) {
    // Il CMP esterno gestisce default e banner: GTM parte subito e il CMP governa i tag via Consent Mode.
    loadGTM();
  } else {
    var saved = read();
    if (C.GTM_LOAD_BEFORE_CONSENT) loadGTM();
    if (saved) apply(saved, false);
    else {
      var show = function () { build(); open(false); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
    }
  }
})();

/* ==========================================================================
   Tracciamento: parametri di campagna (gclid, gbraid, wbraid, UTM) ed eventi dataLayer.
   - I parametri si leggono dall'URL al primo accesso e restano in memoria per tutta la visita.
   - Solo con consenso marketing vengono salvati anche in un cookie di prima parte (90 giorni),
     così restano disponibili se l'utente torna in un secondo momento.
   - Eventi: form_start, form_step_2, generate_lead (da form.js), click_to_call, click_email (questi due oggi non scattano: vedi sotto),
     thank_you_view (solo sulla pagina di ringraziamento). Dettagli in TRACKING.md.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.ERICA_CONFIG || {};
  var KEYS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var COOKIE = 'erica_attr';
  var dl = window.dataLayer = window.dataLayer || [];
  var log = window.EricaLog || function () {};

  var attr = {};

  /* ---------- Attribuzione ---------- */
  function cleanUrl() { return (location.origin + location.pathname + location.search).slice(0, 500); }

  function fromUrl() {
    var p = new URLSearchParams(location.search), o = {}, any = false;
    KEYS.forEach(function (k) {
      var v = p.get(k);
      if (v) { o[k] = v.slice(0, 200); any = true; }
    });
    return any ? o : null;
  }

  function readStored() {
    var raw = window.EricaCookies && window.EricaCookies.get(COOKIE);
    if (!raw) return null;
    try { return JSON.parse(decodeURIComponent(raw)); } catch (e) { return null; }
  }

  function hasParams(o) { return KEYS.some(function (k) { return o && o[k]; }); }

  function persist() {
    if (!window.EricaConsent || !window.EricaConsent.isMarketing() || !hasParams(attr)) return;
    window.EricaCookies.set(COOKIE, encodeURIComponent(JSON.stringify(attr)), C.ATTRIBUTION_COOKIE_DAYS || 90);
  }

  (function init() {
    var fresh = fromUrl(), stored = readStored();
    if (fresh) {
      // Un nuovo clic sostituisce la vecchia attribuzione (ultimo clic)
      attr = fresh;
      attr.landing_url = cleanUrl();
      attr.referrer = (document.referrer || '').slice(0, 300);
      attr.first_seen_at = new Date().toISOString();
    } else if (stored && hasParams(stored)) {
      attr = stored;
    } else {
      attr = { landing_url: cleanUrl(), referrer: (document.referrer || '').slice(0, 300), first_seen_at: new Date().toISOString() };
    }
    persist();
    if (window.EricaConsent) window.EricaConsent.onChange(persist);
    log('attribuzione', attr);
  })();

  /* ---------- dataLayer ---------- */
  function push(event, params) {
    var obj = { event: event };
    if (params) for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) obj[k] = params[k];
    if (C.PAGE_AREA && !obj.page_area) obj.page_area = C.PAGE_AREA;   // distingue le pagine duplicate per altre aree
    dl.push(obj);
    if (window.EricaUtil && window.EricaUtil.debug && window.console) {
      var shown = {};
      for (var key in obj) if (key !== 'eventCallback') shown[key] = obj[key];
      console.info('%c[dataLayer.push]', 'color:#13385E;font-weight:700', shown);
    }
    return obj;
  }

  /* Compila i campi nascosti di un modulo (chiamata all'avvio e subito prima dell'invio) */
  function fillHiddenFields(form) {
    KEYS.forEach(function (k) { if (form.elements[k]) form.elements[k].value = attr[k] || ''; });
    if (form.elements.landing_url) form.elements.landing_url.value = attr.landing_url || cleanUrl();
    if (form.elements.timestamp) form.elements.timestamp.value = new Date().toISOString();
  }

  /* ---------- Clic su email e telefono ----------
     La pagina non contiene né numeri di telefono né indirizzi email (si contatta Erica solo dal modulo),
     quindi oggi nessuno dei due eventi scatta; il gestore resta pronto se in futuro si reinserisce un link tel: o mailto:. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a) return;
    var isTel = a.getAttribute('href').indexOf('tel:') === 0;
    push(isTel ? 'click_to_call' : 'click_email', {
      link_url: a.getAttribute('href'),
      link_text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      link_location: a.getAttribute('data-loc') || 'altro'
    });
  });

  /* ---------- Pagina di ringraziamento ---------- */
  if (document.documentElement.getAttribute('data-page') === 'thanks') {
    var lid = new URLSearchParams(location.search).get('lid') || '';
    push('thank_you_view', { lead_id: lid.slice(0, 64) });
  }

  window.EricaTracking = {
    KEYS: KEYS,
    getAttribution: function () { return attr; },
    fillHiddenFields: fillHiddenFields,
    push: push
  };
})();

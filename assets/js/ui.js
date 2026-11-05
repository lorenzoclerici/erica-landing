/* ==========================================================================
   Interfaccia: link alle informative, certificazioni da mostrare, barra mobile, scorrimento al modulo.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.ERICA_CONFIG || {};
  var U = window.EricaUtil || { isPlaceholder: function () { return true; } };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function init() {
    /* Link a Privacy e Cookie Policy (gli unici ammessi verso l'esterno della pagina) */
    $$('[data-link]').forEach(function (a) {
      var url = C[a.getAttribute('data-link') === 'privacy' ? 'PRIVACY_URL' : 'COOKIE_URL'];
      if (U.isPlaceholder(url)) {
        a.setAttribute('href', '#');
        a.removeAttribute('target');
        a.setAttribute('data-placeholder', 'true');
        a.addEventListener('click', function (e) { e.preventDefault(); });
      } else {
        a.setAttribute('href', url);
      }
    });
    if (U.isPlaceholder(C.PRIVACY_URL) && window.console) console.warn('[Erica] PRIVACY_URL / COOKIE_URL non configurati in assets/js/config.js.');

    /* Certificazioni: nasconde quelle impostate a false in config.js */
    var certs = C.CERTIFICATIONS || {};
    Object.keys(certs).forEach(function (k) {
      if (certs[k] === false) $$('[data-cert="' + k + '"]').forEach(function (el) { el.hidden = true; });
    });

    /* "Gestisci cookie" */
    $$('[data-consent-open]').forEach(function (b) {
      b.addEventListener('click', function () { if (window.EricaConsent) window.EricaConsent.open(true); });
    });

    /* Scorrimento al modulo più vicino (hero o CTA finale) */
    var targets = ['modulo', 'modulo-finale'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $$('a[href="#modulo"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (!targets.length) return;
        e.preventDefault();
        var mid = window.innerHeight / 2, best = targets[0], bestD = Infinity;
        targets.forEach(function (t) {
          var r = t.getBoundingClientRect(), d = Math.abs((r.top + r.height / 2) - mid);
          if (d < bestD) { bestD = d; best = t; }
        });
        best.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        best.setAttribute('tabindex', '-1');
        best.focus({ preventScroll: true });
      });
    });

    /* Barra fissa mobile: si nasconde quando è già visibile il pulsante dell'hero o un modulo */
    var bar = document.querySelector('[data-sticky-bar]');
    var heroCta = document.getElementById('hero-cta');
    var watched = heroCta ? targets.concat(heroCta) : targets;
    if (bar && 'IntersectionObserver' in window && watched.length) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
        var any = Object.keys(visible).some(function (k) { return visible[k]; });
        bar.classList.toggle('is-hidden', any);
      }, { threshold: 0.12 });
      watched.forEach(function (t) { io.observe(t); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

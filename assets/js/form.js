/* ==========================================================================
   Modulo di richiesta in due step (hero + CTA finale).
   Le due istanze nascono dallo stesso <template id="lead-form-template">, con ID univoci,
   e condividono lo stato: valori, step corrente, invio in corso.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.ERICA_CONFIG || {};
  var T = window.EricaTracking;
  var U = window.EricaUtil || { isPlaceholder: function () { return true; }, isLocal: false };
  var log = window.EricaLog || function () {};

  /* ---------- Province italiane (107) ---------- */
  var PROVINCES = ('AG:Agrigento|AL:Alessandria|AN:Ancona|AO:Aosta|AR:Arezzo|AP:Ascoli Piceno|AT:Asti|AV:Avellino|BA:Bari|BT:Barletta-Andria-Trani|BL:Belluno|BN:Benevento|BG:Bergamo|BI:Biella|BO:Bologna|BZ:Bolzano|BS:Brescia|BR:Brindisi|CA:Cagliari|CL:Caltanissetta|CB:Campobasso|CE:Caserta|CT:Catania|CZ:Catanzaro|CH:Chieti|CO:Como|CS:Cosenza|CR:Cremona|KR:Crotone|CN:Cuneo|EN:Enna|FM:Fermo|FE:Ferrara|FI:Firenze|FG:Foggia|FC:Forlì-Cesena|FR:Frosinone|GE:Genova|GO:Gorizia|GR:Grosseto|IM:Imperia|IS:Isernia|AQ:L’Aquila|SP:La Spezia|LT:Latina|LE:Lecce|LC:Lecco|LI:Livorno|LO:Lodi|LU:Lucca|MC:Macerata|MN:Mantova|MS:Massa-Carrara|MT:Matera|ME:Messina|MI:Milano|MO:Modena|MB:Monza e della Brianza|NA:Napoli|NO:Novara|NU:Nuoro|OR:Oristano|PD:Padova|PA:Palermo|PR:Parma|PV:Pavia|PG:Perugia|PU:Pesaro e Urbino|PE:Pescara|PC:Piacenza|PI:Pisa|PT:Pistoia|PN:Pordenone|PZ:Potenza|PO:Prato|RG:Ragusa|RA:Ravenna|RC:Reggio Calabria|RE:Reggio Emilia|RI:Rieti|RN:Rimini|RM:Roma|RO:Rovigo|SA:Salerno|SS:Sassari|SV:Savona|SI:Siena|SR:Siracusa|SO:Sondrio|SU:Sud Sardegna|TA:Taranto|TE:Teramo|TR:Terni|TO:Torino|TP:Trapani|TN:Trento|TV:Treviso|TS:Trieste|UD:Udine|VA:Varese|VE:Venezia|VB:Verbano-Cusio-Ossola|VC:Vercelli|VR:Verona|VV:Vibo Valentia|VI:Vicenza|VT:Viterbo')
    .split('|').map(function (s) { var p = s.split(':'); return { code: p[0], name: p[1] }; })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'it'); });

  /* ---------- Validazione ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var CER_RE = /^(0[1-9]|1\d|20)\s?\d{2}\s?\d{2}\s?\*?$/;
  var FREE_MAIL = /@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|libero|virgilio|tiscali|icloud|me|alice|tin|email)\.[a-z.]+$/i;

  /** Partita IVA italiana: 11 cifre + carattere di controllo (algoritmo di Luhn adattato). */
  function normalizeVat(v) { return String(v || '').replace(/[\s.\-]/g, '').replace(/^IT/i, ''); }
  function validVat(v) {
    var n = normalizeVat(v);
    if (!/^\d{11}$/.test(n) || /^0{7}/.test(n)) return false;
    var sum = 0;
    for (var i = 0; i < 10; i++) {
      var d = +n.charAt(i);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return ((10 - (sum % 10)) % 10) === +n.charAt(10);
  }
  function normalizeCer(v) {
    var d = String(v || '').replace(/[^\d*]/g, '');
    var star = d.indexOf('*') > -1;
    d = d.replace(/\*/g, '');
    return d.length === 6 ? d.replace(/(\d{2})(\d{2})(\d{2})/, '$1 $2 $3') + (star ? '*' : '') : String(v || '').trim();
  }
  function phoneDigits(v) { return String(v || '').replace(/\D/g, ''); }
  function validPhone(v) {
    var d = phoneDigits(v);
    return /^\+?[\d\s().\-\/]+$/.test(v) && d.length >= 8 && d.length <= 15;
  }
  function toE164(v) {
    var d = String(v || '').replace(/[^\d+]/g, '');
    if (d.indexOf('00') === 0) d = '+' + d.slice(2);
    if (d.charAt(0) !== '+') d = '+39' + d;
    return d;
  }

  var RULES = {
    waste_type: function (v) { return v ? '' : 'Selezionate la tipologia di rifiuto.'; },
    waste_type_other: function (v, all) { return all.waste_type === 'altro' && v.length < 3 ? 'Descrivete brevemente il rifiuto.' : ''; },
    hazardous: function (v) { return v ? '' : 'Indicate se il rifiuto è pericoloso (o “Non so”).'; },
    cer_code: function (v) { return !v || CER_RE.test(v) ? '' : 'Il codice CER ha il formato xx xx xx, per esempio 08 01 11*.'; },
    quantity: function (v) { return v ? '' : 'Selezionate la quantità stimata (o “Non so”).'; },
    frequency: function (v) { return v ? '' : 'Indicate se il ritiro è una tantum o periodico.'; },
    province: function (v) { return v ? '' : 'Selezionate la provincia del sito di ritiro.'; },
    company_name: function (v) { return v.length >= 2 ? '' : 'Inserite la ragione sociale.'; },
    vat_number: function (v) {
      if (!v) return 'Inserite la partita IVA.';
      return validVat(v) ? '' : 'La partita IVA non è valida: controllate le 11 cifre.';
    },
    full_name: function (v) { return /\S+\s+\S+/.test(v) ? '' : 'Inserite nome e cognome.'; },
    email: function (v) {
      if (!v) return 'Inserite l’email aziendale.';
      return EMAIL_RE.test(v) ? '' : 'Inserite un indirizzo email valido, per esempio nome@azienda.it.';
    },
    phone: function (v) {
      if (!v) return 'Inserite un numero di telefono.';
      return validPhone(v) ? '' : 'Inserite un numero di telefono valido, solo cifre e prefisso.';
    },
    privacy: function (v) { return v ? '' : 'Per inviare la richiesta serve il consenso al trattamento dei dati.'; }
  };
  var STEP_FIELDS = {
    1: ['waste_type', 'waste_type_other', 'hazardous', 'cer_code', 'quantity', 'frequency', 'province'],
    2: ['company_name', 'vat_number', 'full_name', 'email', 'phone', 'privacy']
  };
  var STEP_NAMES = { 1: 'Il rifiuto', 2: 'I contatti' };
  var SYNC_FIELDS = ['waste_type', 'waste_type_other', 'hazardous', 'cer_code', 'quantity', 'frequency', 'province',
    'company_name', 'vat_number', 'full_name', 'role', 'email', 'phone', 'notes', 'privacy', 'marketing'];

  /* ---------- Stato condiviso ---------- */
  var instances = [];
  var state = { values: {}, step: 1, status: 'idle', started: false, startTime: 0, step2Tracked: false };

  function each(fn) { instances.forEach(fn); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'lead-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function once(fn) { var done = false; return function () { if (done) return; done = true; fn(); }; }

  /* ---------- Istanza del modulo ---------- */
  function LeadForm(mount, loc, uid) {
    this.loc = loc;
    this.uid = uid;
    var tpl = document.getElementById('lead-form-template');
    var wrap = document.createElement('div');
    wrap.innerHTML = tpl.innerHTML.split('__ID__').join(uid);
    this.form = wrap.querySelector('form');
    mount.appendChild(this.form);

    var sel = this.form.elements.province;
    PROVINCES.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.code;
      o.textContent = p.name + ' (' + p.code + ')';
      sel.appendChild(o);
    });
    this.touched = {};
    this.bind();
    T.fillHiddenFields(this.form);
  }

  LeadForm.prototype.q = function (sel) { return this.form.querySelector(sel); };
  LeadForm.prototype.field = function (name) { return this.form.querySelector('[data-field="' + name + '"]'); };

  LeadForm.prototype.getValue = function (name) {
    var els = this.form.elements[name];
    if (!els) return '';
    if (els.length !== undefined && !els.tagName) {            // RadioNodeList
      return els.value || '';
    }
    if (els.type === 'checkbox') return !!els.checked;
    return String(els.value || '').trim();
  };

  LeadForm.prototype.setValue = function (name, value) {
    var els = this.form.elements[name];
    if (!els) return;
    if (els.length !== undefined && !els.tagName) { els.value = value || ''; return; }
    if (els.type === 'checkbox') els.checked = !!value;
    else if (els.value !== value) els.value = value == null ? '' : value;
  };

  LeadForm.prototype.values = function () {
    var out = {};
    SYNC_FIELDS.forEach(function (n) { out[n] = this.getValue(n); }, this);
    return out;
  };

  /* Errori */
  LeadForm.prototype.setError = function (name, msg) {
    var f = this.field(name);
    if (!f) return;
    var err = f.querySelector('.field__err');
    var controls = f.querySelectorAll('input:not([type=radio]), select, textarea, .seg');
    f.classList.toggle('is-invalid', !!msg);
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    Array.prototype.forEach.call(controls, function (c) {
      if (msg) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
    });
  };

  LeadForm.prototype.validateField = function (name, silent) {
    var all = this.values();
    var rule = RULES[name];
    if (!rule) return '';
    var v = all[name];
    var msg = rule(v, all);
    if (!silent) this.setError(name, msg);
    return msg;
  };

  LeadForm.prototype.focusField = function (name) {
    var f = this.field(name);
    if (!f) return;
    var el = f.querySelector('input:not([type=radio]):not([type=hidden]), select, textarea') || f.querySelector('input[type=radio]');
    if (el) el.focus();
  };

  /* Elementi condizionali e suggerimenti */
  LeadForm.prototype.refreshConditional = function () {
    var other = this.field('waste_type_other');
    var show = this.getValue('waste_type') === 'altro';
    other.hidden = !show;
    if (!show) this.setError('waste_type_other', '');
  };

  LeadForm.prototype.refreshEmailHint = function () {
    var hint = this.q('#' + this.uid + '-email-hint');
    var v = this.getValue('email');
    var free = EMAIL_RE.test(v) && FREE_MAIL.test(v);
    hint.hidden = !free;
    hint.textContent = free ? 'Se possibile indicate un’email aziendale: ci aiuta a verificare la richiesta.' : '';
  };

  /* Step, avanzamento, pulsanti */
  LeadForm.prototype.renderStep = function () {
    var n = state.step;
    Array.prototype.forEach.call(this.form.querySelectorAll('.lf__step'), function (s) {
      s.hidden = s.getAttribute('data-step') !== String(n);
    });
    this.q('[data-step-label]').textContent = 'Passo ' + n + ' di 2';
    this.q('[data-step-name]').textContent = STEP_NAMES[n];
    var bar = this.q('.lf__bar');
    bar.setAttribute('aria-valuenow', n);
    this.q('[data-bar]').style.width = (n * 50) + '%';
    this.q('[data-back]').hidden = n === 1;
    this.q('[data-next]').hidden = n === 2;
    this.q('[data-submit]').hidden = n === 1;
  };

  LeadForm.prototype.renderSending = function (on) {
    var submit = this.q('[data-submit]');
    var label = this.q('[data-submit-label]');
    this.form.setAttribute('aria-busy', on ? 'true' : 'false');
    submit.disabled = on;
    this.q('[data-back]').disabled = on;
    label.innerHTML = on ? '<span class="spinner" aria-hidden="true"></span> Invio in corso…' : 'Invia la richiesta';
  };

  LeadForm.prototype.showAlert = function (html) {
    var a = this.q('[data-alert]');
    a.innerHTML = html || '';
    a.hidden = !html;
  };

  /* Eventi */
  LeadForm.prototype.bind = function () {
    var self = this, form = this.form;

    var markStart = function () {
      if (state.started) return;
      state.started = true;
      state.startTime = Date.now();
      T.push('form_start', { form_id: form.getAttribute('data-form-id'), form_location: self.loc });
    };
    form.addEventListener('focusin', markStart);
    form.addEventListener('input', markStart);

    // Sincronizzazione dei valori tra le istanze + pulizia errori
    var onChange = function (e) {
      var t = e.target, name = t.name;
      if (!name || SYNC_FIELDS.indexOf(name) === -1) return;
      var value = self.getValue(name);
      state.values[name] = value;
      each(function (inst) {
        if (inst === self) return;
        inst.setValue(name, value);
        if (name === 'waste_type') inst.refreshConditional();
        if (name === 'email') inst.refreshEmailHint();
      });
      if (name === 'waste_type') self.refreshConditional();
      if (name === 'cer_code' && e.type === 'change') {
        var norm = normalizeCer(value);
        if (norm !== value && CER_RE.test(norm)) { self.setValue('cer_code', norm); each(function (i) { i.setValue('cer_code', norm); }); }
      }
      if (name === 'email') self.refreshEmailHint();
      // Rivalida in tempo reale solo i campi già segnalati o già "toccati"
      var f = self.field(name);
      if (f && (f.classList.contains('is-invalid') || self.touched[name])) {
        var msg = self.validateField(name);
        each(function (inst) { if (inst !== self) inst.setError(name, msg); });
      }
    };
    form.addEventListener('input', onChange);
    form.addEventListener('change', onChange);

    // Validazione all'uscita dal campo
    form.addEventListener('focusout', function (e) {
      var name = e.target.name;
      if (!name || !RULES[name] || e.target.type === 'radio' || e.target.type === 'checkbox') return;
      if (e.target.value === '' && !self.touched[name]) { self.touched[name] = false; return; }
      self.touched[name] = true;
      var msg = self.validateField(name);
      each(function (inst) { if (inst !== self) inst.setError(name, msg); });
    });

    this.q('[data-next]').addEventListener('click', function () { self.next(); });
    this.q('[data-back]').addEventListener('click', function () { goStep(1, self); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (state.step === 1) self.next(); else submitLead(self);
    });
  };

  LeadForm.prototype.validateStep = function (n) {
    var self = this, firstInvalid = null;
    STEP_FIELDS[n].forEach(function (name) {
      var msg = self.validateField(name);
      each(function (inst) { if (inst !== self) inst.setError(name, msg); });
      if (msg && !firstInvalid) firstInvalid = name;
    });
    return firstInvalid;
  };

  LeadForm.prototype.next = function () {
    var bad = this.validateStep(1);
    if (bad) { this.focusField(bad); return; }
    if (!state.step2Tracked) {
      state.step2Tracked = true;
      T.push('form_step_2', { form_id: this.form.getAttribute('data-form-id'), form_location: this.loc });
    }
    goStep(2, this);
  };

  function goStep(n, source) {
    state.step = n;
    each(function (inst) { inst.renderStep(); });
    // Annuncio per gli screen reader e posizione corretta senza aprire la tastiera su mobile
    var head = source.q('.lf__progress-text');
    head.setAttribute('tabindex', '-1');
    head.setAttribute('aria-live', 'polite');
    head.focus({ preventScroll: true });
    var top = source.form.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * .5) {
      source.form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* ---------- Invio ---------- */
  function buildPayload(inst, leadId) {
    T.fillHiddenFields(inst.form);
    var v = inst.values(), el = inst.form.elements, now = new Date().toISOString();
    var consent = window.EricaConsent && window.EricaConsent.get();
    var attr = T.getAttribution();
    return {
      lead_id: leadId,
      submitted_at: now,
      page_area: C.PAGE_AREA || '',
      landing_url: el.landing_url.value,
      referrer: attr.referrer || '',
      gclid: el.gclid.value, gbraid: el.gbraid.value, wbraid: el.wbraid.value,
      utm_source: el.utm_source.value, utm_medium: el.utm_medium.value, utm_campaign: el.utm_campaign.value,
      utm_term: el.utm_term.value, utm_content: el.utm_content.value,
      waste_type: v.waste_type,
      waste_type_other: v.waste_type === 'altro' ? v.waste_type_other : '',
      hazardous: v.hazardous,
      cer_code: v.cer_code ? normalizeCer(v.cer_code) : '',
      quantity: v.quantity,
      frequency: v.frequency,
      province: v.province,
      company_name: v.company_name,
      vat_number: normalizeVat(v.vat_number),
      full_name: v.full_name,
      role: v.role,
      email: v.email,
      phone: v.phone,
      phone_e164: toE164(v.phone),
      notes: v.notes,
      privacy_accepted: true,
      privacy_accepted_at: now,
      marketing_optin: !!v.marketing,
      consent_cookie_analytics: !!(consent && consent.analytics),
      consent_cookie_marketing: !!(consent && consent.marketing),
      form_location: inst.loc,
      form_elapsed_ms: state.startTime ? Date.now() - state.startTime : null,
      user_language: navigator.language || ''
    };
  }

  function send(payload) {
    var url = C.WEBHOOK_URL;
    if (U.isPlaceholder(url)) {
      if (U.isLocal) {
        log('webhook (SIMULATO: WEBHOOK_URL non configurato)', payload);
        return new Promise(function (res) { setTimeout(res, 700); });
      }
      return Promise.reject(new Error('WEBHOOK_URL non configurato'));
    }
    var ctl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, C.FORM_TIMEOUT_MS || 12000);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
    }, function (e) { clearTimeout(timer); throw e; });
  }

  function submitLead(inst) {
    if (state.status !== 'idle') return;                      // blocca il doppio invio

    // Honeypot: i bot lo compilano, le persone no. Finto successo senza inviare nulla.
    var hp = '';
    each(function (i) { hp += i.getValue('company_website'); });
    if (hp) {
      state.status = 'done';
      each(function (i) { i.renderSending(true); });
      setTimeout(function () { location.assign(new URL(C.THANKS_URL || 'grazie/', location.href).href); }, 600);
      return;
    }

    var bad1 = inst.validateStep(1), bad2 = inst.validateStep(2);
    if (bad1) { goStep(1, inst); inst.focusField(bad1); return; }
    if (bad2) { inst.focusField(bad2); return; }

    state.status = 'sending';
    each(function (i) { i.showAlert(''); i.renderSending(true); });

    var leadId = uuid();
    var payload = buildPayload(inst, leadId);
    log('invio modulo', payload);

    send(payload).then(function () {
      state.status = 'done';
      onSuccess(inst, payload, leadId);
    }).catch(function (err) {
      state.status = 'idle';
      log('errore invio', err);
      T.push('form_submit_error', { form_id: inst.form.getAttribute('data-form-id'), error_type: String(err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || 'errore').slice(0, 80) });
      each(function (i) {
        i.renderSending(false);
        i.showAlert('Non siamo riusciti a inviare la richiesta. Riprovate tra un momento.');
      });
      var a = inst.q('[data-alert]');
      if (a && a.scrollIntoView) a.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  function onSuccess(inst, p, leadId) {
    var go = once(function () {
      var url = new URL(C.THANKS_URL || 'grazie/', location.href);
      url.searchParams.set('lid', leadId);
      location.assign(url.href);
    });

    var ev = {
      form_id: inst.form.getAttribute('data-form-id'),
      form_location: inst.loc,
      lead_id: leadId,
      transaction_id: leadId,                                  // per la deduplicazione delle conversioni
      waste_type: p.waste_type,
      hazardous: p.hazardous,
      quantity: p.quantity,
      frequency: p.frequency,
      province: p.province,
      eventCallback: go,
      eventTimeout: 2000
    };
    // Conversioni avanzate: dati dell'utente solo se è concesso ad_user_data
    if (window.EricaConsent && window.EricaConsent.hasAdUserData()) {
      ev.user_data = { email: p.email.toLowerCase(), phone_number: p.phone_e164 };
    }
    T.push('generate_lead', ev);

    // Se GTM non è attivo (nessun consenso) non c'è nulla da attendere; altrimenti si aspetta l'eventCallback
    if (!(window.EricaConsent && window.EricaConsent.gtmLoaded())) go();
    else setTimeout(go, C.REDIRECT_MAX_WAIT_MS || 1500);
  }

  /* ---------- Avvio ---------- */
  function init() {
    var mounts = document.querySelectorAll('[data-lead-form]');
    if (!mounts.length || !document.getElementById('lead-form-template')) return;
    Array.prototype.forEach.call(mounts, function (m, i) {
      var loc = m.getAttribute('data-lead-form');
      instances.push(new LeadForm(m, loc, 'lf' + (i + 1)));
    });
    each(function (inst) { inst.renderStep(); });
  }

  window.EricaForm = {
    validVat: validVat,
    normalizeCer: normalizeCer,
    toE164: toE164,
    provinceCount: PROVINCES.length
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

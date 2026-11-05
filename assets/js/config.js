/* ==========================================================================
   CONFIGURAZIONE UNICA · Erica Srl · Landing "Smaltimento rifiuti industriali"
   Tutti gli ID e gli URL da sostituire prima della pubblicazione stanno qui.
   I valori nel formato {{NOME}} sono segnaposto: gli script li riconoscono e non li usano.
   (I testi segnaposto dentro index.html, come {{TEMPI_DI_RISPOSTA}} e {{DOMINIO}}, vanno
   invece sostituiti nell'HTML: vedi README.md.)
   ========================================================================== */
window.ERICA_CONFIG = {

  /* --- Tracciamento ---------------------------------------------------- */
  GTM_ID: '{{GTM_ID}}',                 // es. 'GTM-ABC1234'

  /* --- Invio del modulo ------------------------------------------------ */
  WEBHOOK_URL: '{{WEBHOOK_URL}}',       // webhook n8n verso il CRM (POST JSON, CORS abilitato per il dominio)
  THANKS_URL: 'grazie/',                // pagina di ringraziamento (relativa a questa pagina)
  FORM_TIMEOUT_MS: 12000,               // tempo massimo di attesa della risposta del webhook
  REDIRECT_MAX_WAIT_MS: 1500,           // attesa massima dell'evento generate_lead prima del redirect

  /* --- Pagina / area della campagna ------------------------------------ */
  PAGE_AREA: 'smaltimento-rifiuti-industriali',  // inviata al CRM: utile quando si duplica la pagina

  /* --- Informative ------------------------------------------------------ */
  PRIVACY_URL: '{{PRIVACY_URL}}',       // URL completo della Privacy Policy
  COOKIE_URL: '{{COOKIE_URL}}',         // URL completo della Cookie Policy

  /* --- Consenso cookie (Consent Mode v2) -------------------------------- */
  CMP: '{{CMP}}',                       // solo promemoria: 'Iubenda', 'Cookiebot'… (vedi README)
  CONSENT_PROVIDER: 'internal',         // 'internal' = banner incluso in questa pagina
                                        // 'external' = banner del CMP scelto (vedi README, sezione Consenso)
  GTM_LOAD_BEFORE_CONSENT: false,       // false = GTM parte solo dopo un consenso (nessun tag prima)
                                        // true  = GTM parte subito con consenso "denied" (Consent Mode avanzato)
  CONSENT_VERSION: 1,                   // aumentare per richiedere di nuovo il consenso se cambiano le informative
  CONSENT_COOKIE_DAYS: 180,
  ATTRIBUTION_COOKIE_DAYS: 90,          // durata del cookie con gclid e UTM (solo con consenso marketing)

  /* --- Certificazioni mostrate in pagina ------------------------------------
     Mettere false per nascondere ovunque una certificazione non ancora confermata/rinnovata. */
  CERTIFICATIONS: { albo: true, iso: true, uni125: true, ecovadis: true },

  /* --- Debug ---------------------------------------------------------------
     true = stampa in console gli eventi dataLayer. Su localhost è sempre attivo; in produzione si può
     attivare anche aggiungendo ?ericadebug=1 all'indirizzo. */
  DEBUG: false
};

# TRACKING · Landing "Smaltimento rifiuti industriali" · Erica Srl

Questo file descrive cosa emette la pagina e cosa configurare in **Google Tag Manager (GTM)** e in **Google Ads**.
Tutti gli ID stanno in `assets/js/config.js` (`GTM_ID`, `WEBHOOK_URL`, …).

## 1. Come funziona, in breve

1. All'apertura la pagina imposta Consent Mode v2 su **"denied"** per tutti i segnali (`ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`, …).
2. Compare il banner cookie. **GTM non viene caricato** finché l'utente non concede almeno una categoria (Statistici o Marketing). Prima del consenso non parte nessuna richiesta verso Google.
3. Dopo la scelta la pagina invia `gtag('consent', 'update', …)` e, se c'è almeno un consenso, carica il contenitore GTM.
4. Gli eventi qui sotto vengono scritti nel `dataLayer` (anche prima del consenso: restano in memoria e non vengono inviati a nessuno). Quando GTM viene caricato dopo il consenso, elabora anche gli eventi già presenti (per esempio un `form_start` precedente alla scelta nel banner).
5. Alla conferma del modulo la pagina porta l'utente a `/grazie/?lid=<lead_id>`.

> **Consent Mode "base" o "avanzato".** Con `GTM_LOAD_BEFORE_CONSENT: false` (default) si usa la modalità *base*: chi rifiuta i cookie non genera nessuna richiesta verso Google, quindi non c'è modellazione delle conversioni per quegli utenti. Con `true` GTM parte subito con consenso "denied" (modalità *avanzata*): Google riceve ping senza cookie e può stimare le conversioni mancanti, ma la compatibilità con la posizione del Garante va valutata con il DPO. La scelta è del cliente.

### Segnali di consenso

| Scelta nel banner | `ad_storage` | `ad_user_data` | `ad_personalization` | `analytics_storage` |
|---|---|---|---|---|
| Rifiuta | denied | denied | denied | denied |
| Solo Statistici | denied | denied | denied | **granted** |
| Solo Marketing | **granted** | **granted** | **granted** | denied |
| Accetta tutti | granted | granted | granted | granted |

`security_storage` è sempre `granted`; `functionality_storage` e `personalization_storage` restano `denied` (la pagina non li usa).

### Cookie e storage della pagina

| Nome | Tipo | Durata | Quando |
|---|---|---|---|
| `erica_consent` | tecnico | 180 giorni | Dopo qualsiasi scelta nel banner (serve a ricordarla) |
| `erica_attr` | marketing | 90 giorni | Solo con consenso Marketing: contiene `gclid`, `gbraid`, `wbraid`, UTM, URL e referrer del primo accesso |
| `_gcl_*`, `_ga*` | terze parti (Google) | variabile | Solo dopo il consenso, creati da GTM/Google tag |

Senza consenso Marketing i parametri della campagna restano **solo in memoria** per la durata della visita (si rileggono dall'URL a ogni caricamento) e non vengono scritti in nessun cookie o storage.

## 2. Eventi `dataLayer`

Ogni evento contiene anche `page_area` (valore di `PAGE_AREA` in `config.js`, es. `smaltimento-rifiuti-industriali`): serve a distinguere le pagine quando si duplica la landing per altre aree.

| Evento | Quando | Parametri |
|---|---|---|
| `form_start` | Prima interazione con il modulo (una volta per visita) | `form_id`, `form_location` (`hero` o `cta`) |
| `form_step_2` | Passaggio dal passo 1 al passo 2 (una volta per visita) | `form_id`, `form_location` |
| `generate_lead` | **Invio riuscito del modulo** (evento principale) | `form_id`, `form_location`, `lead_id`, `transaction_id` (uguale a `lead_id`), `waste_type`, `hazardous`, `quantity`, `frequency`, `province`, `user_data` (vedi sotto) |
| `click_to_call` | Clic su un link `tel:`. **Oggi non scatta**: la pagina non contiene numeri di telefono, ma il codice è pronto se se ne reinserisce uno | `link_url`, `link_text`, `link_location` |
| `click_email` | Clic su un link `mailto:`. **Oggi non scatta**: la pagina non contiene indirizzi email, ma il codice è pronto se se ne reinserisce uno | `link_url`, `link_text`, `link_location` |
| `thank_you_view` | Apertura di `/grazie/` | `lead_id` (letto da `?lid=`) |
| `form_submit_error` | Il webhook non risponde o risponde con errore (diagnostico, non è una conversione) | `form_id`, `error_type` (`timeout`, `HTTP 500`, …) |

Valori dei parametri di `generate_lead`:

- `waste_type`: `liquido`, `fango`, `solido`, `imballaggio_contaminato`, `altro`
- `hazardous`: `si`, `no`, `non_so`
- `quantity`: `lt1` (< 1 t), `1_5`, `5_20`, `gt20` (> 20 t), `non_so`
- `frequency`: `una_tantum`, `periodica`
- `province`: sigla (es. `MB`)

`link_location` identifica il punto della pagina in cui si trova il link (attributo `data-loc`). Oggi la pagina non ha link a telefono o email, quindi `click_to_call` e `click_email` non scattano.

### `user_data` (conversioni avanzate)

`generate_lead` contiene un oggetto `user_data` **solo se l'utente ha concesso il consenso Marketing** (cioè `ad_user_data` = granted):

```json
"user_data": { "email": "nome.cognome@azienda.it", "phone_number": "+390212345678" }
```

Email in minuscolo e telefono in formato E.164 (`+39…`). I valori sono in chiaro nel `dataLayer`: l'hash SHA-256 lo applica il tag Google Ads/Google tag quando "conversioni avanzate" è attivo. Senza consenso l'oggetto non esiste e non viene inviato nulla.

### Redirect e attesa dell'evento

Dopo il successo del webhook la pagina emette `generate_lead` con `eventCallback` e `eventTimeout: 2000` e va a `/grazie/` quando GTM ha finito di far partire i tag. Se GTM non è caricato (nessun consenso) il redirect è immediato; se GTM non risponde, parte comunque dopo `REDIRECT_MAX_WAIT_MS` (1,5 s).

## 3. Cosa configurare in GTM

### Variabili (Livello dati)

Crea queste **Variabili del livello dati** (versione 2): `lead_id`, `transaction_id`, `waste_type`, `hazardous`, `quantity`, `frequency`, `province`, `form_location`, `page_area`, `link_location`, `link_url`, `user_data.email`, `user_data.phone_number`.

Per le conversioni avanzate crea una variabile **Dati forniti dall'utente** (tipo *Impostazione manuale*): email = `{{DLV user_data.email}}`, telefono = `{{DLV user_data.phone_number}}`.

### Attivatori (Evento personalizzato)

`generate_lead`, `form_start`, `form_step_2`, `thank_you_view`, `form_submit_error`.

### Tag

| Tag | Attivatore | Note |
|---|---|---|
| **Collegamento conversioni** (Conversion Linker) | Initialization – All Pages | Impostazioni consenso: richiede `ad_storage` |
| **Google tag** (ID `AW-XXXXXXXXX`, ed eventualmente GA4) | Initialization – All Pages | I tag Google leggono da soli Consent Mode: verificare che i controlli integrati siano attivi |
| **Conversione Google Ads – Lead modulo** | `generate_lead` | ID conversione e etichetta dell'azione (sotto). *ID transazione* = `{{DLV lead_id}}`. Attivare *Conversioni avanzate* con la variabile Dati forniti dall'utente. Richiede `ad_storage` e `ad_user_data` |
| **GA4 – eventi** (facoltativo) | gli stessi attivatori | Richiede `analytics_storage` |

**Altri tag di marketing** (Meta, LinkedIn, …) devono avere *Impostazioni consenso → Richiedi consenso aggiuntivo* su `ad_storage` (e `ad_user_data` se inviano dati dell'utente). Senza questa impostazione partirebbero anche con consenso "denied" quando GTM è caricato per via delle sole statistiche.

## 4. Cosa configurare in Google Ads

Crea le azioni di conversione (Obiettivi → Conversioni → Nuova azione → Sito web → Imposta manualmente):

| Azione | Categoria | Origine | Obiettivo/Priorità | Conteggio |
|---|---|---|---|---|
| **Lead – modulo smaltimento rifiuti industriali** | Invio modulo lead | Sito web (tag GTM su `generate_lead`) | **Principale** | Uno |

- Attiva le **conversioni avanzate per i lead** o le **conversioni avanzate per il web** (il tag usa i dati `user_data`).
- Account nuovo, senza storico: imposta come obiettivo principale **solo il lead da modulo**. Non ci sono altre azioni di conversione: la pagina non ha telefono né email, si contatta Erica solo dal modulo.
- **Importazione offline dal CRM.** Il webhook invia al CRM `gclid`, `gbraid` e `wbraid`: salvali sul contatto, così potrai importare in Google Ads i lead qualificati/chiusi come conversioni offline.
- **Pagina `/grazie/` come conversione basata su URL.** Funziona come copia di sicurezza, ma **non** va attivata insieme a `generate_lead` sulla stessa azione, altrimenti si conta due volte. Se la usi, tieni il tag in pausa e attivalo solo se `generate_lead` smette di funzionare. Le due conversioni si deduplicano solo se usano lo stesso *ID transazione*: `lead_id` arriva anche in `/grazie/?lid=…`.

## 5. Dati inviati al webhook (CRM)

`POST` con `Content-Type: application/json` a `WEBHOOK_URL`. Campi (tutti al primo livello):

| Campo | Contenuto |
|---|---|
| `lead_id` | UUID del lead, utile come chiave anti-duplicato |
| `submitted_at` | Data e ora ISO 8601 (UTC) |
| `page_area`, `form_location` | Area della pagina; modulo usato (`hero`/`cta`) |
| `landing_url`, `referrer` | Indirizzo del primo accesso con i parametri e provenienza |
| `gclid`, `gbraid`, `wbraid` | Identificativi di clic Google Ads |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | Parametri UTM |
| `waste_type`, `waste_type_other`, `hazardous`, `cer_code`, `quantity`, `frequency`, `province` | Passo 1 (il codice CER è normalizzato nel formato `xx xx xx*`) |
| `company_name`, `vat_number`, `full_name`, `role`, `email`, `phone`, `phone_e164`, `notes` | Passo 2 (`vat_number` senza spazi né prefisso IT) |
| `privacy_accepted`, `privacy_accepted_at` | Consenso all'informativa e momento (per la prova) |
| `marketing_optin` | Casella facoltativa marketing |
| `consent_cookie_analytics`, `consent_cookie_marketing` | Scelta nel banner cookie |
| `form_elapsed_ms`, `user_language` | Tempo dalla prima interazione e lingua del browser (per filtrare lo spam lato n8n) |

Il webhook deve rispondere con uno stato 2xx per far considerare l'invio riuscito. Va abilitato il **CORS** per il dominio della landing (in n8n: *Allowed Origins* sul nodo Webhook); la richiesta ha `Content-Type: application/json`, quindi il browser invia prima una richiesta `OPTIONS`.

## 6. Come verificare

1. Aprire la pagina con `?ericadebug=1` (su localhost il debug è sempre attivo) e la console del browser: ogni `dataLayer.push` e ogni chiamata `gtag` compare con il prefisso `[Erica …]`.
2. Aprire la pagina con parametri, per esempio `/?gclid=TEST123&utm_source=google&utm_medium=cpc&utm_campaign=prova`, e verificare nella console `[Erica · attribuzione]`.
3. Scheda *Rete* del browser **prima** di scegliere nel banner: non deve esserci nessuna richiesta a `googletagmanager.com`, `google-analytics.com`, `googleadservices.com`, `doubleclick.net`. Dopo "Accetta tutti" deve comparire `gtm.js?id=…`.
4. Modalità *Anteprima* di GTM e **Tag Assistant**: controllare che alla conferma del modulo scatti `generate_lead` con i parametri e, con consenso Marketing, con `user_data`.
5. In Google Ads, *Diagnostica* dell'azione di conversione: dopo qualche invio di prova lo stato passa a "Registrazione conversioni".

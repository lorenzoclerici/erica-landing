# Landing "Smaltimento rifiuti industriali" · Erica Srl

Landing page per la campagna Google Ads Search sull'area **Smaltimento rifiuti industriali**.
Sito statico (HTML, CSS e JavaScript senza framework): si pubblica su qualsiasi hosting o sottodominio.
Gli eventi e la configurazione di GTM e Google Ads sono in [TRACKING.md](TRACKING.md).

## Contenuto della cartella

```
index.html              Landing page (con template del modulo e dati strutturati)
grazie/index.html       Pagina di ringraziamento (si apre su /grazie/)
assets/
  css/style.css         Stili (token colore e font in cima al file)
  js/config.js          ★ Configurazione unica: ID, URL, impostazioni
  js/consent.js         Consent Mode v2, banner cookie, caricamento di GTM
  js/tracking.js        gclid/UTM, eventi dataLayer
  js/form.js            Modulo in due step, validazione, invio al webhook
  js/ui.js              Link alle informative, certificazioni, barra mobile, scorrimento
  img/                  Loghi SVG, simbolo, favicon, foto foresta (WebP), immagine Open Graph
  fonts/                Barlow 400/500/600/700 (woff2) e licenza OFL
TRACKING.md             Eventi, parametri, configurazione GTM e Google Ads
README.md               Questo file
```

## Anteprima in locale

Dalla cartella del progetto:

```bash
python3 -m http.server 8000
```

poi apri <http://localhost:8000>. Su `localhost` il debug è attivo (gli eventi compaiono nella console) e, finché `WEBHOOK_URL` non è configurato, l'invio del modulo viene **simulato** (il payload si vede in console) e porta comunque a `/grazie/`. Fuori da localhost, con `WEBHOOK_URL` non configurato, il modulo mostra l'errore e invita a riprovare: così non si perdono lead in silenzio.

## Pubblicazione

1. Compila `assets/js/config.js` (vedi sotto) e sostituisci i segnaposto nell'HTML.
2. Carica l'intera cartella sull'hosting, **in HTTPS**.
3. Verifica che `https://<dominio>/grazie/` si apra (la pagina è in `grazie/index.html`, così funziona su qualsiasi hosting senza regole di riscrittura).
4. Configura il CORS del webhook n8n per il dominio della landing (vedi TRACKING.md, sezione 5).
5. Configura GTM e Google Ads (TRACKING.md) e ripeti la verifica del paragrafo 6 di TRACKING.md.

## Segnaposto da sostituire

Il prompt prevede di non inventare dati: dove manca un'informazione c'è un segnaposto `{{NOME}}`. Nella pagina i segnaposto di testo sono **evidenziati in giallo**, così non si possono dimenticare.

### In `assets/js/config.js`

| Segnaposto | Cosa inserire |
|---|---|
| `GTM_ID` | ID del contenitore GTM (es. `GTM-ABC1234`). Finché non è impostato GTM non viene caricato |
| `WEBHOOK_URL` | URL del webhook n8n che riceve i lead e li inoltra al CRM |
| `PRIVACY_URL`, `COOKIE_URL` | Indirizzi completi di Privacy Policy e Cookie Policy (si aprono in una nuova scheda) |
| `CMP` | Solo promemoria del CMP scelto (Iubenda, Cookiebot, …) |
| `CERTIFICATIONS` | Mettere `false` per nascondere ovunque una certificazione non confermata |
| `ATTACH_MAX_FILES`, `ATTACH_MAX_FILE_MB`, `ATTACH_MAX_TOTAL_MB`, `ATTACH_IMAGE_MAX_PX`, `ATTACH_TIMEOUT_MS` | Limiti degli allegati facoltativi del modulo (oggi 5 file, 8 MB ciascuno, 10 MB in tutto). Sono già impostati: cambiarli solo se serve, tenendo conto del limite di n8n (TRACKING.md, sezione 5) |

### In `index.html` e `grazie/index.html` (cerca e sostituisci)

| Segnaposto | Dove | Cosa inserire |
|---|---|---|
| `{{TEMPI_DI_RISPOSTA}}` | Sotto il modulo (template) e in `grazie/index.html` | Tempo di risposta reale, es. "entro un giorno lavorativo" |
| `{{DOMINIO}}` | `og:url`, `og:image`, dati strutturati `Organization` | Dominio di pubblicazione, senza `https://` |

Per sostituirli in un colpo solo (esempio):

```bash
sed -i '' 's/{{DOMINIO}}/offerta.esempio.it/g' index.html
```

## Da confermare con il cliente prima del lancio

1. **Certificazioni.** Sul sito ufficiale i PDF ISO 9001 e ISO 14001 riportavano scadenza marzo/aprile 2026: a oggi (5 novembre 2026) risultano **scadute se non rinnovate**. Servono i certificati aggiornati prima di mostrare i riferimenti ISO. Servono anche livello e anno della valutazione EcoVadis e la conferma di UNI/PdR 125. Intanto si può nascondere ciò che non è confermato con `CERTIFICATIONS` in `config.js`.
2. **Loghi originali delle certificazioni.** Nella sezione "Certificazioni" ci sono icone neutre con il nome: i marchi veri vanno sostituiti con i file forniti dal cliente (non vanno ridisegnati). Vedi i commenti nell'HTML.
3. **Albo Gestori Ambientali.** Categorie e classi di iscrizione n. MI40834, per non promettere servizi oltre l'autorizzazione.
4. **Area geografica.** La pagina dice che raccolta e trasporto coprono tutto il territorio nazionale (dato del sito ufficiale). Se la campagna è mirata a una zona, adeguare FAQ e testo della sezione trasporto.
5. **Target ed esclusioni.** Settori prioritari, quantità minima, altre esclusioni (amianto, piccolissimi artigiani…): oggi la pagina dice solo che il servizio è dedicato ad aziende e non a privati.
6. **Elenco dei rifiuti** (sezione "Quali rifiuti gestiamo") e **opzioni del modulo** (tipologie, confezionamento, fasce di quantità, ruoli). Gli esempi sono illustrativi.
7. **Foto reali** di mezzi, impianti o personale (non richieste, consigliate): oggi la sezione trasporto usa illustrazioni a linea schematiche e non rappresentano i mezzi veri.
8. **`noindex, follow`.** Impostato nella pagina per non competere con ericambiente.it; confermare.
9. **Informative privacy e cookie** aggiornate con i dati raccolti dal modulo (codice fiscale, ruolo, **foto e documenti allegati**) e con il tracciamento descritto in TRACKING.md.
10. **Allegati nel flusso n8n.** Il webhook deve gestire `attachments` (file in base64), ricontrollare tipo e peso dei file, alzare se serve il limite di 16 MB sul corpo della richiesta e decidere dove salvarli e per quanto tempo (TRACKING.md, sezione 5, "Allegati").

## Scelte tecniche da conoscere

- **Snippet `<noscript>` di GTM omesso.** Senza JavaScript non si può raccogliere il consenso, quindi non deve partire nessun tag. Il contenitore viene inserito via script in `consent.js`, che garantisce l'ordine corretto (consenso "denied" → scelta → GTM).
- **Nessun telefono né email in pagina.** Si contatta Erica solo dal modulo (scelta del cliente): non ci sono link `tel:` o `mailto:`, né nel footer né nel messaggio d'errore dell'invio, e nemmeno nei dati strutturati. Gli eventi `click_to_call` e `click_email` restano previsti dal codice ma oggi non scattano. Il campo "Telefono" del modulo resta: è il numero del cliente per essere richiamato. Se l'invio del modulo fallisce, il messaggio dice solo di riprovare: tenere d'occhio l'evento `form_submit_error` e il webhook.
- **GTM parte solo dopo un consenso** (`GTM_LOAD_BEFORE_CONSENT: false`). Vedi TRACKING.md per il compromesso con la modellazione delle conversioni.
- **Parametri di campagna prima del consenso.** `gclid` e UTM restano in memoria e si rileggono dall'URL; non si scrive nessun cookie né storage. Il cookie `erica_attr` (90 giorni) nasce solo con consenso Marketing.
- **`/grazie/` come cartella** (`grazie/index.html`) invece di `grazie.html`, per avere l'indirizzo pulito ovunque.
- **Font Barlow ospitato in locale.** Il prompt indica Barlow di Google Fonts; l'ho scaricato in `assets/fonts/` (pesi 400/500/600/700, `woff2`, solo sottoinsieme latino, circa 16 KB ciascuno) e collegato con `@font-face` in `style.css`. Così non parte nessuna richiesta a Google prima del consenso e l'indirizzo IP dell'utente non viene comunicato a Google per i font. La licenza (SIL Open Font License 1.1) è in `assets/fonts/OFL.txt` e va lasciata nella cartella. Se servono altri caratteri (per esempio il latino esteso) basta aggiungere i file corrispondenti di Google Fonts.
- **Banner cookie interno.** Rifiuta e Accetta hanno lo stesso peso; "Gestisci cookie" nel footer permette di cambiare idea in qualsiasi momento (la revoca cancella `erica_attr` e i cookie Google noti). Per usare un CMP di terze parti: `CONSENT_PROVIDER: 'external'`, togliere il banner interno (non viene più mostrato) e, nel callback del CMP, chiamare `EricaConsent.set({ analytics: true|false, marketing: true|false })`. Con un CMP esterno è il CMP a gestire i valori predefiniti di Consent Mode e GTM parte subito.
- **Eventi in più** rispetto al prompt: `thank_you_view` (apertura di `/grazie/`) e `form_submit_error` (webhook in errore). Servono per controllare il funzionamento.
- **Campi in più nel payload**: `lead_id`, `page_area`, `phone_e164`, il consenso cookie e `form_elapsed_ms` (vedi TRACKING.md, sezione 5).
- **Allegati facoltativi (foto del materiale e analisi del rifiuto).** Nel passo 2 del modulo, sopra le note: JPG, PNG, WebP o PDF. I file restano in memoria nel browser e partono nello stesso POST JSON del modulo, codificati in base64, così il webhook resta uno solo e non servono altri endpoint. Le foto pesanti vengono ridimensionate prima dell'invio (meno peso da mobile, niente dati GPS). Nel `dataLayer` finisce solo `attachments_count`.

## Come duplicare la pagina per un'altra area della campagna

1. Copia la cartella (o `index.html` + `grazie/`) e condividi `assets/`.
2. In `assets/js/config.js` cambia `PAGE_AREA` (es. `distruzione-fiscale-merci`): finisce in tutti gli eventi `dataLayer` e nel payload del CRM.
3. In `index.html` aggiorna: `<title>`, meta description, tag Open Graph, H1 e sottotitolo, sezioni 3–5 (problemi, come funziona, rifiuti/servizi), card "Perché Erica" se serve, **FAQ e dati strutturati `FAQPage`** (i testi devono restare identici), CTA finale.
4. Sostituisci le immagini (`assets/img/foresta-*.webp`, `og-image.jpg`) o rimuovi la sezione d'impatto.
5. Adatta le opzioni del modulo nel `<template id="lead-form-template">` (il template è unico: si modifica una volta e vale per hero e CTA finale).
6. Aggiorna i testi di `grazie/index.html` se cambia il servizio.
7. In GTM filtra gli attivatori per `page_area` se vuoi conversioni separate per area.

## Cosa è stato verificato

Provato nel browser integrato (Chromium) in locale a 360, 768 e 1440 px: nessuno scorrimento orizzontale, pulsante o barra mobile sopra la piega a 360 × 740, modulo a due step con validazione e sincronizzazione tra i due moduli, codice fiscale (società a 11 cifre e persone fisiche a 16 caratteri, con controllo), eventi `dataLayer`, consenso (nessuna richiesta a Google prima della scelta, GTM dopo il consenso, revoca), cookie con `gclid`/UTM, invio al webhook (simulato e con server di prova, incluso l'errore 500) e redirect a `/grazie/`. Allegati: aggiunta e rimozione sincronizzate tra i due moduli, rifiuto dei formati non ammessi, limiti di numero e peso, ridimensionamento delle foto (una foto da 11,5 MB è arrivata come JPEG da 1,5 MB, 2000 × 1500 px), file ricevuti dal webhook di prova identici a quelli inviati, invio senza allegati (`attachments` vuoto), errore del webhook con allegati e layout a 360 px.

**Non verificato**: contenitore GTM reale e conversioni in Google Ads (mancano gli ID), webhook n8n reale (CORS e ricezione degli allegati), scelta delle foto da fotocamera o galleria su iPhone e Android (formato HEIC compreso), browser Safari/iOS e Android su dispositivi veri, Lighthouse/LCP su rete mobile reale.

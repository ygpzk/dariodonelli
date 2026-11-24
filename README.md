# Sito — Ing. Dario Donelli

Sito dello studio tecnico dell'Ing. Dario Donelli, Rivalta sul Mincio (MN).
React + Vite, impostazione minimale ed editoriale, sempre in bianco e nero:
carta calda, inchiostro, filetti sottili. Tre voci tipografiche: Inter Tight
pesante e stretto per i titoli, Fraunces leggero per gli attacchi, Inter per
il testo. Nessuna icona e nessun pulsante: le azioni sono collegamenti
testuali. I titoli salgono parola per parola da una maschera, le immagini si
scoprono dal basso, e la testata resta in vista con il filetto di avanzamento;
con il movimento ridotto è
tutto fermo (vedi la coda di `src/index.css`).

La prima schermata dice tutto: il nome, il marchio, le due righe della targa e
il carosello dei lavori in evidenza, con l'indice delle sezioni in una riga.
Scorrendo si approfondisce: servizi, **archivio dei lavori** (34 lavori, nelle
tre categorie dell'elenco dello studio: Strutture, Edilizia, Agricoltura), lo
studio con le collaborazioni, l'incarico, il BIM in preparazione, i contatti.
Ogni lavoro ha una sua pagina, `/lavori/<id>`, con la scheda tecnica, il
racconto, le tavole PDF originali e le fotografie, da sfogliare e ingrandire nel
visualizzatore della pagina.

## Comandi

```bash
npm install
npm run dev       # sviluppo su http://localhost:5173
npm run build     # produzione in dist/ (build SSR + prerender di tutte le pagine)
npm run preview   # anteprima della build
npm run lint      # oxlint
npm run lavori -- <cartella> [--contact <cartella>]   # rigenera i materiali dei lavori
```

## Struttura

- `src/content.js` — testi e dati dello studio (recapiti, servizi, ambiti, albo)
- `src/lavori.js` — **l'archivio dei lavori**: categorie, titoli, descrizioni,
  didascalie, lavori in evidenza. È il file da modificare per cambiare un testo
- `src/lavori.data.js` — generato da `npm run lavori`: l'elenco dei file di
  ogni lavoro con le loro misure. Non si modifica a mano
- `src/routes.js` — le pagine del sito (principale + una per lavoro) e i loro
  titolo, descrizione e anteprima di condivisione
- `src/App.jsx` — componenti della pagina principale (carosello compreso) e
  della scheda del lavoro, più il piccolo router (pushState) che le collega. La
  cronologia salva la quota di scorrimento e la riga dell'archivio da cui si è
  entrati nella scheda; l'header ha il menu a tutto schermo sotto i 1020 px
- `src/App.css`, `src/lavori.css` — stili dei componenti; il secondo copre
  carosello, archivio e schede dei lavori
- `src/motion.js` — scorrimento morbido (Lenis) e rivelazioni allo scroll
- `src/viewer/` — visualizzatore di PDF, DWG e immagini (solo consultazione:
  niente barra degli strumenti, niente scaricamento). Sopra il piano, a tutta
  larghezza, la striscia con tutte le miniature (come la timeline di un
  programma di montaggio); sotto, l'elenco con le miniature
- `src/index.css` — token di design (colori, tipografia, spazio), font e base
- `public/js.js` — aggiunge la classe `js` prima del primo disegno; è un file
  esterno perché la Content Security Policy non ammetta script in linea
- `public/lavori/<id>/` — i file pubblicati di ogni lavoro (vedi sotto)
- `public/images/` — la targa e la sede (jpg/png + webp)
- `public/fonts/` — Inter Tight, Fraunces e Inter auto-ospitati (woff2 variabili)
- `scripts/` — lo script che prepara i materiali dei lavori; le sue due
  tabelle (`lavori-sources.json`, `lavori-fixes.json`) restano solo in locale
- `originali/` — materiali sorgente: l'originale della foto della sede; in
  locale anche l'elenco dei lavori consegnato dallo studio (`.docx`)

Il repository è pubblico. L'elenco dello studio e le due tabelle dello script
citano i committenti privati con nome e cognome (sono i nomi delle cartelle
dell'archivio), quindi sono esclusi in `.gitignore`: servono solo a chi ha
anche l'archivio sorgente, che non sta qui. Vanno conservati con quello.

## L'archivio dei lavori

### Da dove vengono i contenuti

Dallo studio sono arrivati due materiali: l'archivio «Progetti x Sito» (una
cartella per lavoro con tavole PDF e fotografie, 169 file) e il documento
«Elenco lavori per sito», che per ogni lavoro dà anno, committente, una riga di
descrizione, i materiali disponibili e la categoria. I testi delle schede
(`src/lavori.js`) derivano da quell'elenco, dai cartigli delle tavole (comune,
oggetto dell'intervento) e da ciò che si vede nelle fotografie; non aggiungono
dati non documentati (importi, superfici, date non presenti nei materiali).

Nomi: imprese, enti e società compaiono per esteso; dei committenti privati
resta il solo cognome («Casa Rocca», «Piscina Fermi»).

### Dati sensibili oscurati

Le tavole hanno nel cartiglio il committente con indirizzo, codice fiscale o
partita IVA, l'indirizzo dell'immobile, i riferimenti catastali, i recapiti e
la firma del progettista. Queste zone vengono **oscurate dentro il PDF**
(`scripts/lavori-fixes.json`, voce `redact`, in millimetri del foglio): lo
script disegna la zona con pdf.js, la rende illeggibile (mosaico e sfumatura)
e la rimette sulla pagina come immagine con pdf-lib; le annotazioni della
pagina (timbri, firme) vengono tolte. Le anteprime si generano dal PDF già
oscurato. Nelle fotografie si sfumano targhe, numeri civici, cassette della
posta e volti (voce `blur`, in frazioni dell'immagine), e i metadati vengono
rimossi (le foto dei telefoni portano la posizione GPS). I PDF prendono nomi
neutri (`tavola-1.pdf`…) perché i nomi originali citano i committenti.

Limite da sapere: sotto la sfumatura il contenuto resta nel file. Nelle tavole
da CAD il testo è quasi sempre geometria (contorni delle lettere) e non si
estrae; in sei tavole il testo è testo vero e un programma potrebbe ancora
leggerlo. Se serve una rimozione certa, la via è rasterizzare la pagina.

### Come sono pubblicati i file

Per ogni lavoro, in `public/lavori/<id>/`:

- `tavola-<n>.pdf` — il PDF, oscurato, che il visualizzatore legge
  direttamente (pdf.js), pagina per pagina, nitido a ogni ingrandimento;
- `tavola-<n>-p<N>.webp` (1200 px) e `tavola-<n>-p<N>-mini.webp` (320 px) —
  anteprime di ogni pagina: la prima sta sotto la pagina mentre il PDF si apre,
  la seconda serve a elenchi e griglie;
- `<foto>.webp` (1800 px sul lato lungo) e `<foto>-mini.webp` (480 px) — la
  fotografia per il visualizzatore e la sua miniatura.

Nel carosello, nelle griglie e nelle copertine le fotografie sono in bianco e
nero (filtro CSS) e prendono colore al passaggio del puntatore; nel
visualizzatore sono a colori, come le tavole.

### Aggiungere o aggiornare un lavoro

1. Mettere la cartella del lavoro nell'archivio sorgente (fuori dal repository;
   l'originale sta nei materiali consegnati dallo studio).
2. Aggiungere la riga `"<nome cartella>": "<id>"` in
   `scripts/lavori-sources.json`. L'`id` è l'indirizzo della pagina.
3. In `scripts/lavori-fixes.json` indicare le zone da oscurare nelle tavole
   (`redact`) e nelle foto (`blur`), più eventuali file da saltare, foto da
   raddrizzare o rinominare. Per trovare le zone conviene ritagliare il
   cartiglio a buona risoluzione e misurarlo in millimetri dal bordo del foglio.
4. `npm run lavori -- "<cartella sorgente>"`: rigenera `public/lavori/` e
   `src/lavori.data.js`. Con `--contact <cartella>` produce anche un foglio di
   contatto per lavoro (tutte le immagini con il nome del file originale),
   utile per scrivere le didascalie.
5. Scrivere la scheda in `src/lavori.js`: anno, categoria, titolo, sottotitolo,
   committente, luogo, prestazione, riassunto, paragrafi, titoli delle tavole
   (chiavi `tavola-<n>`) e didascalie delle fotografie (chiavi = nomi dei file
   normalizzati, come in `lavori.data.js`), copertina, e i due giudizi
   `primaDopo` (le foto mostrano il prima e il dopo) e `finito` (c'è una
   buona foto del lavoro concluso). Con eventuale `hero`/`heroPos` per il
   taglio largo del carosello.
6. `npm run build`: la nuova pagina viene prerenderizzata e finisce in sitemap.

### Filtro, indirizzi e ritorno alla riga

L'archivio apre con tutti i lavori. Le categorie sono bottoni che filtrano
senza cambiare pagina; la categoria attiva si chiude cliccandola di nuovo e
finisce nell'indirizzo (`/?categoria=strutture`), così il filtro si può
condividere e il tasto indietro lo ritrova. Ogni riga ha l'ancora
`#lavoro-<id>`: dalla scheda, «Tutti i lavori» e la freccia in basso a
sinistra riportano esattamente alla riga da cui si era entrati, e la riga
resta segnata con `:target`.

### I lavori in evidenza

Il carosello della pagina principale non si compone a mano: lo decide un
punteggio, in fondo a `src/lavori.js` (`lavoriInEvidenza`). Servono almeno 3
fotografie; poi 1 punto per foto (fino a 10), mezzo punto per ogni anno dopo
il 2010, 3 punti se c'è il prima e il dopo, 2 se c'è una buona foto del
finito. Entrano i primi 10, più il migliore di ogni categoria rimasta fuori
se supera 12 punti, in ordine di punteggio. Fa eccezione il lavoro segnato
`apertura`: lo sceglie lo studio ed è sempre il primo (oggi la Casa in via
Tezzone). Un lavoro nuovo ben documentato entra da solo.

## Prerender e indirizzi

Il sito viene prerenderizzato in fase di build (`plugins/prerender.js`): la
pagina principale sta in `dist/index.html`, ogni lavoro in
`dist/lavori/<id>/index.html` con titolo, descrizione, `canonical` e tag Open
Graph propri (l'anteprima di condivisione è la copertina del lavoro). React vi
si aggancia con l'hydration. Il prerender scrive anche `sitemap.xml`,
`robots.txt` e la pagina `404.html`. L'indirizzo pubblico sta in `siteUrl`
(`src/content.js`) e arriva a `index.html` tramite il segnaposto `%SITE_URL%`
che Vite sostituisce in sviluppo e in build: il dominio si cambia in un punto
solo.

Il deploy è su Vercel. Le pagine dei lavori sono file statici
(`dist/lavori/<id>/index.html`) e la home è `dist/index.html`; `vercel.json`
tiene vivi i vecchi indirizzi (`/servizi`, `/progetti`, `/studio`,
`/contatti`) con un rewrite alla home. Gli altri indirizzi ricevono
`dist/404.html`, generata dal prerender, con lo stato 404. Anche senza il file
statico il sito funziona: il router legge l'indirizzo e mostra la pagina
giusta.

## Sicurezza e privacy

`vercel.json` manda a tutte le risposte una Content Security Policy senza
`unsafe-inline` per gli script, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS e `Cross-Origin-Opener-Policy`.
Gli script sono file esterni (anche `/js.js`), quindi la policy può restare
stretta; `style-src` ammette solo gli stili in linea, che servono alle
variabili CSS impostate da React.

La mappa di Google non viene caricata all'apertura: il riquadro è un
segnaposto e il servizio parte solo su clic. Finché non si chiede la mappa il
sito non installa cookie; dopo il clic valgono le condizioni di Google. Non ci
sono analytics né font di terze parti. Gli indirizzi email sono composti nel
browser a pezzi (il sorgente non contiene la stringa intera) e il link
`mailto` viene creato dopo l'idratazione. Le immagini dell'archivio sono
pubblicate senza metadati e con le zone sensibili oscurate (vedi sopra).

L’indirizzo pubblico è `https://dariodonelli.com`, in `siteUrl`
(`src/content.js`): il valore passa a `index.html` tramite Vite, e il prerender
lo usa per canonical, Open Graph, sitemap e robots.

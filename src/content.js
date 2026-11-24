/**
 * Contenuti del sito.
 *
 * Tutti i testi derivano dai materiali già presenti nell'implementazione
 * precedente e dal documento di revisione dello studio: non sono state
 * introdotte specializzazioni, certificazioni, anni di esperienza, numeri
 * o referenze non verificate.
 */

/**
 * Indirizzo pubblico del sito, senza barra finale: alimenta i tag di
 * condivisione, i canonical e la sitemap generati dal prerender. Il dominio
 * si cambia qui: index.html lo riceve da Vite (vedi vite.config.js).
 */
export const siteUrl = 'https://dariodonelli.com'

export const studio = {
  /* Sulla pagina il nome compare sempre in maiuscolo, come sulla targa:
     lo fa il CSS (text-transform), così etichette, alt e lettori di
     schermo ricevono il nome normale e non lo compitano lettera per
     lettera. */
  name: 'Ing. Dario Donelli',
  role: 'Ingegnere',
  address: 'Via Filippo Turati, 1, 46040 Rivalta sul Mincio MN',
  addressLines: ['Via Filippo Turati, 1', '46040 Rivalta sul Mincio (MN)'],
  phoneHref: 'tel:+393384007913',
  phoneDisplay: '+39 338 400 7913',
  emailUser: 'info',
  emailDomain: 'dariodonelli.com',
  pec: 'dario.donelli@ingpec.eu',
  pecUser: 'dario.donelli',
  pecDomain: 'ingpec.eu',
  pecHref: 'mailto:dario.donelli@ingpec.eu',
  /* Dati fiscali: compaiono nel piè di pagina, come in un'intestazione. */
  vat: 'IT 02311150201',
  taxCode: 'DNLDRA79D17B110L',
  sdi: 'M5UXCR1',
  /* Si punta alle coordinate e non all'indirizzo: la ricerca testuale su
     Rivalta sul Mincio non porta sempre al civico giusto. */
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=45.180182%2C10.677598',
  /** Coordinate dello studio: alimentano il riquadro della mappa. */
  geo: { lat: 45.180182, lng: 10.677598 },
  /** Le due righe incise sulla targa dello studio. */
  plate: ['Ingegneria · Architettura · Ambiente', 'Progettazione integrale e coordinata'],
}

/**
 * Sorgente del riquadro cartografico dei contatti: Google Maps, come
 * chiesto dallo studio. L'iframe sta già nella pagina e si carica subito,
 * come un'immagine: nessun segnaposto e nessun testo sopra. Il servizio può
 * quindi installare i suoi cookie all'apertura; il CSS vira la mappa in
 * bianco e nero.
 */
export const mapEmbedSrc = (() => {
  const { lat, lng } = studio.geo
  return `https://maps.google.com/maps?q=${lat},${lng}&z=17&hl=it&output=embed`
})()

/**
 * Profilo professionale. I dati provengono dall'iscrizione all'albo:
 * iscrizione all'Ordine di Mantova n. 1495 dal 24/05/2010, settore a)
 * civile e ambientale. La formazione è raccontata senza date di laurea,
 * come chiesto dallo studio.
 */
export const profile = {
  bio: [
    'La formazione acquisita unisce due sguardi che spesso restano separati: quello dell’architettura, attento allo spazio e a come viene vissuto, e quello dell’ingegneria, che deve rispondere della struttura e dei numeri. Progetto tenendoli insieme, perché un intervento riuscito è quello in cui la soluzione tecnica e l’uso quotidiano dell’edificio non si contraddicono.',
    'Lavoro come libero professionista sul territorio mantovano, con studio a Rivalta sul Mincio. Seguo personalmente ogni incarico dalla prima valutazione fino alla chiusura del cantiere: chi mi affida un lavoro parla sempre con la stessa persona, senza passaggi intermedi.',
    'Questo significa progettazione integrale e coordinata: architettura, strutture, impianti, prevenzione incendi, sicurezza in cantiere ed energia non sono pratiche separate da mettere in fila, ma discipline che vengono tenute insieme fin dall’inizio. È il modo più efficace per evitare che un problema emerga quando è ormai costoso risolverlo.',
  ],
  /** Scheda sintetica accanto alla biografia. */
  credentials: [
    { label: 'Ordine', value: 'Ingegneri di Mantova, n. 1495' },
    { label: 'Iscritto dal', value: '24 maggio 2010' },
    { label: 'Settore', value: 'a) Civile e ambientale' },
    { label: 'P. IVA', value: studio.vat },
  ],
}

/**
 * Sezioni della pagina. Il sito è una pagina sola: ogni voce punta a una
 * sezione tramite ancora; l'elenco alimenta i numeri delle intestazioni e
 * i collegamenti dell'header e del footer.
 */
export const sections = [
  { id: 'servizi', num: '01', label: 'Servizi' },
  { id: 'lavori', num: '02', label: 'Lavori' },
  { id: 'studio', num: '03', label: 'Studio' },
  { id: 'metodo', num: '04', label: 'L’incarico' },
  { id: 'bim', num: '05', label: 'BIM' },
  { id: 'contatti', num: '06', label: 'Contatti' },
]

/**
 * Riga informativa sotto la testata: le due righe della targa, in una
 * sola riga. Prende il posto della località e dell'anno, che restano nei
 * contatti e nel piè di pagina.
 */
export const infoline = ['Ingegneria', 'Architettura', 'Ambiente', 'Progettazione integrale e coordinata']

/**
 * Tre aree di lavoro. Ognuna spiega cosa comprende e a chi serve.
 * L'immagine è un file dell'archivio dei lavori (src/lavori.js): il lavoro
 * e la voce (una fotografia o una pagina di tavola) che la rappresenta.
 */
export const serviceAreas = [
  {
    id: 'progettazione',
    num: '01',
    cover: { work: 'casa-parolini', item: 'rendering' },
    title: 'Progettazione architettonica',
    text: 'Dagli studi di fattibilità alle pratiche edilizie: un unico percorso per costruire, ampliare o ristrutturare, con il progetto seguito fino al cantiere.',
  },
  {
    id: 'strutture',
    num: '02',
    cover: { work: 'vasca-salizzole', item: '22122010151' },
    title: 'Strutture',
    text: 'Verifica e adeguamento di edifici esistenti, progettazione strutturale di nuove opere. Un approccio che parte dalla conoscenza dell’edificio e arriva al dettaglio esecutivo.',
  },
  {
    id: 'cantiere',
    num: '03',
    cover: { work: 'passeggiata-desenzano', item: 'img-20210709-222548' },
    title: 'Direzione lavori',
    text: 'Presidio del cantiere e verifica di quanto viene realizzato rispetto al progetto, con un riferimento tecnico unico per committente e imprese.',
  },
]

/**
 * Elenco completo delle prestazioni, nell'ordine indicato dallo studio nel
 * documento di revisione: restano le voci segnate, cadono rendering,
 * sicurezza, antincendio e la categoria Industria.
 */
export const serviceIndex = [
  'Studi di fattibilità e progettazione preliminare',
  'Progettazione definitiva',
  'Progettazione esecutiva',
  'Progettazione strutturale e sismica',
  'Riqualificazione energetica',
  'Direzione lavori',
  'Direzione tecnica di cantiere',
  'Pratiche catastali',
  'Perizie e stime',
  'Consulenze tecniche',
]

/**
 * Ambiti di intervento: l'elenco indicato dallo studio nel documento di
 * revisione, nell'ordine in cui è stato consegnato. Compare in testa
 * all'archivio dei lavori.
 */
export const ambiti = [
  'Nuove costruzioni',
  'Riqualificazione energetica',
  'Opere pubbliche',
  'Opere strutturali',
  'Opere industriali',
  'Ristrutturazione edilizia',
  'Restauro e risanamento conservativo',
]

/** Le quattro fasi dell'incarico. */
export const method = [
  {
    num: '01',
    title: 'Sopralluogo',
    text: 'Verifica dello stato dei luoghi, della documentazione disponibile e dei vincoli che riguardano l’immobile.',
  },
  {
    num: '02',
    title: 'Fattibilità',
    text: 'Valutazione di cosa è realizzabile, con un quadro chiaro di tempi, procedure e ordine di spesa.',
  },
  {
    num: '03',
    title: 'Progetto',
    text: 'Sviluppo del progetto nei diversi livelli e predisposizione delle pratiche verso gli enti.',
  },
  {
    num: '04',
    title: 'Cantiere',
    text: 'Direzione lavori, controllo delle lavorazioni e rapporto diretto con le imprese fino alla chiusura.',
  },
]

/**
 * Le discipline dello studio: sono le stesse prestazioni dell'elenco
 * completo, così la colonna dello Studio non racconta un'offerta diversa
 * da quella dei Servizi.
 */
export const disciplines = serviceIndex

/**
 * Il BIM è un percorso appena avviato: la sezione lo dice con onestà,
 * senza presentarlo come un servizio già strutturato.
 */
export const bim = {
  status: 'In preparazione',
  title: 'Il progetto in un modello unico.',
  text: 'Lo studio sta strutturando il passaggio al Building Information Modeling: un modello condiviso in cui architettura, strutture e cantiere parlano la stessa lingua. Il percorso è in corso e sarà raccontato qui, con i primi lavori sviluppati in questa modalità.',
  points: [
    { title: 'Modello coordinato', text: 'Architettura e strutture nello stesso modello, con le interferenze viste prima del cantiere.' },
    { title: 'Documentazione dal modello', text: 'Piante, sezioni e computi coerenti tra loro, aggiornati in un punto solo.' },
    { title: 'Cantiere più leggibile', text: 'Dati e geometrie condivisi con imprese e tecnici, per ridurre le interpretazioni.' },
  ],
}

/**
 * Collaborazioni. Le imprese e le persone che lavorano con lo studio si
 * aggiungono qui: la sezione mostra solo ciò che è scritto in questi elenchi.
 */
export const collaborators = {
  text: 'A seconda dell’incarico, il progetto si avvale di professionisti e imprese scelti di volta in volta. Le collaborazioni stabili sono raccolte qui.',
  technicians: [{ name: 'Giuliana', role: 'Collaboratrice interna' }],
  companies: [],
  note: 'Imprese selezionate di volta in volta.',
}

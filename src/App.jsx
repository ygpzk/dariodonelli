import { Fragment, createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import './lavori.css'
import { prefersReducedMotion, scrollToTarget, useReveal } from './motion.js'
import SheetViewer from './viewer/SheetViewer.jsx'
import {
  ambiti,
  bim,
  collaborators,
  disciplines,
  infoline,
  mapEmbedSrc,
  method,
  profile,
  sections,
  serviceAreas,
  serviceIndex,
  siteUrl,
  studio,
} from './content.js'
import { categories, lavori, lavoriById, lavoriInEvidenza, neighbours } from './lavori.js'
import { resolve, legacyPaths } from './routes.js'

/* ---------------------------------------------------------------------------
   Marchio
   La "D" della targa ridisegnata in vettoriale: una sola linea continua e
   chiusa, con l'angolo retto a sinistra e la curva a destra. Niente ombre,
   niente doppio profilo: il segno resta leggibile a ogni misura.
   Vive nella testata della pagina, non nell'header: lì il nome basta.
   --------------------------------------------------------------------------- */

const LOGO_D = 'M120 120H520A400 400 0 0 1 520 920H120Z'

function Logo({ className = '', ...props }) {
  return (
    <svg viewBox="0 0 1040 1040" fill="none" aria-hidden="true" className={`logo ${className}`} {...props}>
      <path d={LOGO_D} stroke="currentColor" strokeWidth="56" strokeLinejoin="miter" />
    </svg>
  )
}

/* ---------------------------------------------------------------------------
   Pagine e navigazione
   Il sito ha una pagina principale e una scheda per ogni lavoro
   (src/routes.js). Il percorso corrente sta in uno stato di React: i
   collegamenti interni lo cambiano con pushState, senza ricaricare, e il
   tasto indietro del browser lo riporta. Il prerender passa il percorso
   dall'esterno (`url`), così server e browser rendono la stessa pagina.

   La cronologia salva anche la quota di scorrimento: tornando indietro si
   riapre la pagina dove la si era lasciata, e dalle schede «Lavori» riporta
   alla riga da cui si è entrati (vedi `Archive` e `WorkPage`).
   --------------------------------------------------------------------------- */

const RouterContext = createContext({ path: '/', navigate: () => {} })

const useRouter = () => useContext(RouterContext)

const isPlainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

const pad2 = (n) => String(n).padStart(2, '0')

const FILTER_PARAM = 'categoria'

/** useLayoutEffect sul browser, useEffect nel prerender (dove non esiste). */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** La categoria attiva si legge dall'indirizzo: il filtro resta condivisibile. */
function readFilter() {
  if (typeof window === 'undefined') return 'all'
  const value = new URLSearchParams(window.location.search).get(FILTER_PARAM)
  return categories.some((c) => c.id === value) ? value : 'all'
}

/** L'indirizzo del filtro, con l'ancora eventualmente presente. */
function filterUrl(id) {
  const { pathname, search, hash } = window.location
  const params = new URLSearchParams(search)
  if (id === 'all') params.delete(FILTER_PARAM)
  else params.set(FILTER_PARAM, id)
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash}`
}

/**
 * Collegamento a una pagina del sito. Resta un <a> con l'href vero: con il
 * tasto centrale, Ctrl o senza JavaScript funziona come sempre.
 */
function RouteLink({ to, hash, search, className, children, ...props }) {
  const { navigate } = useRouter()
  const href = `${to}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        if (!isPlainClick(e)) return
        e.preventDefault()
        navigate(to, hash, { search })
      }}
      {...props}
    >
      {children}
    </a>
  )
}

/* ---------------------------------------------------------------------------
   Hook di supporto
   --------------------------------------------------------------------------- */

/**
 * Stato dell'header e avanzamento della lettura. Lo scorrimento passa da
 * requestAnimationFrame e cambia lo stato solo quando serve: niente
 * ridisegni a ogni pixel. La barra di avanzamento si scrive direttamente
 * nello stile dell'elemento. L'header resta sempre in vista: le sezioni
 * sono la navigazione del sito e non devono mai sparire.
 */
function useHeaderState() {
  const [scrolled, setScrolled] = useState(false)
  const progressRef = useRef(null)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      progressRef.current?.style.setProperty('--read', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0')
      const next = y > 24
      setScrolled((s) => (s === next ? s : next))
    }

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return { scrolled, progressRef }
}

/** La sezione che sta attraversando la parte alta dello schermo. */
function useActiveSection(enabled) {
  const [active, setActive] = useState('')

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return
    const nodes = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!nodes.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: 0 },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [enabled])

  return enabled ? active : ''
}

/**
 * Un testo parola per parola, ognuna dentro la sua maschera: i titoli
 * salgono da sotto quando entrano nello schermo (o subito, con `now`).
 * Per i lettori di schermo resta il testo intero.
 */
function Split({ text, now = false }) {
  const words = text.split(' ')
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className={now ? 'split split--now' : 'split'} aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={i}>
            <span className="w">
              <span className="w__in" style={{ '--w': i }}>
                {w}
              </span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </span>
    </>
  )
}

function scrollToSection(id) {
  if (!document.getElementById(id)) return
  scrollToTarget(id)
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`)
}

/**
 * Ancore della pagina principale (#servizi, #contatti…). Dalla pagina
 * principale si scorre; da una scheda si torna prima alla principale e poi
 * si scorre alla sezione.
 */
function useAnchorNav() {
  const { path, navigate } = useRouter()
  return useCallback(
    (event) => {
      if (!isPlainClick(event)) return
      const id = event.currentTarget.getAttribute('href').split('#')[1]
      event.preventDefault()
      if (path === '/') scrollToSection(id)
      else navigate('/', id)
    },
    [path, navigate],
  )
}

/**
 * L'indirizzo email non compare mai intero nel sorgente: si compone nel
 * browser e sullo schermo è spezzato in più nodi. Chi legge lo vede
 * normale, i raccoglitori automatici trovano molto meno.
 */
function MailLink({ user, domain, className = '', children, label, ...props }) {
  const linkRef = useRef(null)
  const address = `${user}${String.fromCharCode(64)}${domain}`

  // L'indirizzo compare solo nel DOM dopo l'idratazione: nel sorgente
  // prerenderizzato non c'è un link mailto da raccogliere.
  useEffect(() => {
    if (linkRef.current) linkRef.current.href = `mailto:${address}`
  }, [address])

  return (
    <a
      ref={linkRef}
      className={`mail-link ${className}`}
      aria-label={label || `Scrivi a ${address}`}
      onClick={(e) => {
        if (e.currentTarget.getAttribute('href')) return
        e.preventDefault()
        window.location.href = `mailto:${address}`
      }}
      {...props}
    >
      {children || (
        <>
          <span>{user}</span>
          <span className="mail-link__at" aria-hidden="true">
            @
          </span>
          <span>{domain}</span>
        </>
      )}
    </a>
  )
}

/** Aggiorna i metadati della pagina quando si cambia pagina senza ricaricare. */
function applyPageMeta(page) {
  document.title = page.title
  const url = `${siteUrl}${page.path === '/' ? '/' : page.path}`
  const set = (selector, value) => document.querySelector(selector)?.setAttribute('content', value)
  set('meta[name="description"]', page.description)
  set('meta[property="og:title"]', page.title)
  set('meta[property="og:description"]', page.description)
  set('meta[property="og:url"]', url)
  set('meta[property="og:image"]', page.image)
  set('meta[property="og:image:alt"]', page.imageAlt)
  const canonical = document.querySelector('link[rel="canonical"]')
  if (canonical) canonical.setAttribute('href', url)
}

/* ---------------------------------------------------------------------------
   Header
   --------------------------------------------------------------------------- */

function Brand() {
  return (
    <span className="brand__inner">
      <span className="brand__copy">
        <span className="brand__name">{studio.name}</span>
        <span className="brand__role">Ingegnere · Rivalta sul Mincio</span>
      </span>
    </span>
  )
}

const backToTop = () => {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
  scrollToTarget(0)
}

function MobileMenu({ open, onClose }) {
  const { path, navigate } = useRouter()
  const menuRef = useRef(null)
  const firstLink = useRef(null)
  const lastFocused = useRef(null)

  useEffect(() => {
    if (!open) return
    lastFocused.current = document.activeElement
    document.documentElement.classList.add('is-locked')
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !menuRef.current) return
      const focusable = [...menuRef.current.querySelectorAll('a[href], button:not([disabled])')].filter((el) => el.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    firstLink.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('is-locked')
      lastFocused.current?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  const go = (event, id) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    onClose()
    if (path === '/') {
      // Il menu si chiude e sblocca la pagina; lo scorrimento parte dopo
      // che il blocco è stato tolto, altrimenti resterebbe a zero.
      document.documentElement.classList.remove('is-locked')
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(id)))
    } else {
      navigate('/', id)
    }
  }

  return (
    <div className={`menu${open ? ' is-open' : ''}`} id="menu-sito" role="dialog" aria-modal="true" aria-label="Menu del sito" aria-hidden={!open} inert={!open} ref={menuRef}>
      <div className="menu__inner">
        <div className="menu__top">
          <span className="label">Indice</span>
          <span className="label">{pad2(sections.length)} sezioni</span>
        </div>

        <nav className="menu__nav" aria-label="Sezioni del sito">
          <ol role="list">
            {sections.map((s, i) => (
              <li key={s.id} style={{ '--i': i }}>
                <a href={`/#${s.id}`} onClick={(e) => go(e, s.id)} ref={i === 0 ? firstLink : undefined}>
                  <span className="menu__num">{s.num}</span>
                  <span className="menu__label">{s.label}</span>
                  {s.id === 'bim' && <span className="menu__tag">in preparazione</span>}
                  <span className="menu__arrow" aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="menu__foot">
          <a href={studio.phoneHref}>{studio.phoneDisplay}</a>
          <MailLink user={studio.emailUser} domain={studio.emailDomain} label="Scrivi allo studio" />
          <span>{studio.addressLines.join(' · ')}</span>
        </div>
      </div>
    </div>
  )
}

/* Il nome e, a destra, le sezioni come collegamenti testuali: tutto il
   sito è raggiungibile dalla prima riga. Nelle schede dei lavori le voci
   riportano alla pagina principale. */
function Header() {
  const { scrolled, progressRef } = useHeaderState()
  const { path, navigate } = useRouter()
  const onNav = useAnchorNav()
  const active = useActiveSection(path === '/')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  // Cambiando pagina il menu si chiude da sé.
  useEffect(() => setOpen(false), [path])

  // Tornando a una finestra larga il menu lascia il posto alle sezioni.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 1020) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <>
      <header className={`header${scrolled ? ' header--scrolled' : ''}${open ? ' header--open' : ''}`}>
        <span className="header__read" ref={progressRef} aria-hidden="true" />
        <div className="container header__inner">
          <a
            href="/"
            className="brand"
            aria-label={`${studio.name}, torna all'inizio`}
            onClick={(e) => {
              if (!isPlainClick(e)) return
              e.preventDefault()
              close()
              if (path !== '/') return navigate('/')
              document.documentElement.classList.remove('is-locked')
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  scrollToTarget(0)
                  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
                }),
              )
            }}
          >
            <Brand />
          </a>

          <nav className="header__nav" aria-label="Sezioni">
            {sections.map((s) => (
              <a key={s.id} href={`/#${s.id}`} onClick={onNav} aria-current={active === s.id ? 'true' : undefined} className={s.id === 'bim' ? 'header__nav-bim' : undefined}>
                {s.label}
                {s.id === 'bim' && <span className="header__dot" title="In preparazione" aria-label="in preparazione" />}
              </a>
            ))}
          </nav>

          <button type="button" className="menu-toggle" aria-expanded={open} aria-controls="menu-sito" onClick={() => setOpen((v) => !v)}>
            <span className="menu-toggle__label">{open ? 'Chiudi' : 'Menu'}</span>
            <span className={`menu-toggle__icon${open ? ' is-open' : ''}`} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      {/* Fuori dall'header: il backdrop-filter dell'header creerebbe un
          contenitore per il position:fixed del menu. */}
      <MobileMenu open={open} onClose={close} />
    </>
  )
}

/* ---------------------------------------------------------------------------
   Blocchi riutilizzabili
   --------------------------------------------------------------------------- */

/**
 * Intestazione di sezione: numero ed etichetta sul filetto, poi il titolo.
 * Il filetto sottile è l'unico segno grafico che attraversa il sito.
 */
function SectionHead({ id, title, text, badge }) {
  const section = sections.find((s) => s.id === id)
  return (
    <div className="section-head reveal">
      <div className="section-head__meta">
        <span className="section-head__index">{section.num}</span>
        <span className="label">{section.label}</span>
        {badge && <span className="badge">{badge}</span>}
      </div>
      <div className="section-head__body">
        <h2 className="headline">
          <Split text={title} />
        </h2>
        {text && <p className="lead">{text}</p>}
      </div>
    </div>
  )
}

function Photo({ base, ext = 'jpg', alt, width, height, eager = false, className = '' }) {
  return (
    <picture className={`photo ${className}`}>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img
        src={`${base}.${ext}`}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable="false"
        {...(eager && { fetchPriority: 'high' })}
      />
    </picture>
  )
}

/**
 * Un file dell'archivio (fotografia o pagina di tavola) come immagine:
 * la miniatura da 480 px per le griglie, il file grande quando il riquadro
 * è largo. Le misure sono quelle del file grande: il rapporto resta.
 */
function ArchiveImage({ item, sizes = '(max-width: 720px) 100vw, 33vw', eager = false, className = '', position }) {
  return (
    <img
      className={className}
      style={position ? { objectPosition: position } : undefined}
      src={item.mini}
      srcSet={`${item.mini} 480w, ${item.thumb} ${item.width}w`}
      sizes={sizes}
      alt={item.alt}
      width={item.width}
      height={item.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable="false"
    />
  )
}

/** Un file dell'archivio indicato per lavoro e voce (vedi serviceAreas). */
const archiveItem = ({ work, item }) => lavoriById[work]?.items.find((it) => it.id === item)

/** Collegamento testuale con la sottolineatura sottile: l'unica "azione" del sito. */
function TextLink({ href, onClick, children, className = '', ...props }) {
  return (
    <a className={`text-link ${className}`} href={href} onClick={onClick} {...props}>
      {children}
    </a>
  )
}

/* ---------------------------------------------------------------------------
   Intro: tutto nella prima schermata
   Il nome, il marchio, le due righe della targa e il carosello dei lavori
   in evidenza. Scorrendo si approfondisce: servizi, archivio, studio,
   incarico, BIM, contatti.
   --------------------------------------------------------------------------- */

const SLIDE_MS = 6500

function HeroCarousel() {
  const slides = lavoriInEvidenza
  const total = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const go = useCallback((to) => setIndex(((to % total) + total) % total), [total])

  // Avanza da sé; si ferma sotto il puntatore o con il fuoco, e con il
  // movimento ridotto non si muove affatto. Il cambio manuale riparte da
  // capo con il conto alla rovescia.
  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const timer = setTimeout(() => setIndex((index + 1) % total), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [paused, total, index])

  const current = slides[index]

  /* Sul desktop l'immagine è divisa in tre zone: a sinistra si torna
     indietro, a destra si va avanti, al centro si apre la scheda. Il
     cursore di sistema lascia il posto a un'etichetta che segue il mouse
     e dice cosa farà il clic. La posizione si scrive direttamente nello
     stile, senza passare da React: solo il cambio di zona ridisegna. */
  const cursorRef = useRef(null)
  const [zone, setZone] = useState(null)
  const zoneOf = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const f = (e.clientX - r.left) / r.width
    return { zone: f < 0.3 ? 'prev' : f > 0.7 ? 'next' : 'open', x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onStageMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const z = zoneOf(e)
    if (cursorRef.current) cursorRef.current.style.transform = `translate3d(${z.x}px, ${z.y}px, 0)`
    if (z.zone !== zone) setZone(z.zone)
  }
  // Il clic su una zona laterale non apre la scheda: cambia lavoro.
  const onStageClick = (e) => {
    if (!zone || zone === 'open' || e.target.closest('.hero__dots')) return
    e.preventDefault()
    e.stopPropagation()
    go(index + (zone === 'next' ? 1 : -1))
  }

  /* Sul telefono: un trascinamento orizzontale netto cambia lavoro. */
  const touch = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
    setPaused(true)
  }
  const onTouchEnd = (e) => {
    const start = touch.current
    touch.current = null
    setPaused(false)
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      e.preventDefault() // niente clic dopo uno scorrimento
      go(index + (dx < 0 ? 1 : -1))
    }
  }

  const cursorLabel = zone === 'prev' ? '← Precedente' : zone === 'next' ? 'Successivo →' : 'Apri il lavoro'

  return (
    <section
      className="hero"
      aria-roledescription="carosello"
      aria-label="Lavori in evidenza"
      style={{ '--slide-ms': `${SLIDE_MS}ms` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1)
        if (e.key === 'ArrowLeft') go(index - 1)
      }}
    >
      <div
        className={zone ? `hero__stage has-cursor is-${zone}` : 'hero__stage'}
        onPointerMove={onStageMove}
        onPointerLeave={() => setZone(null)}
        onClickCapture={onStageClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <span className="hero__flag label" aria-hidden="true">
          Lavori in evidenza
        </span>

        {slides.map((w, k) => {
          // Il carosello tiene undici fotografie grandi: si caricano per
          // intero solo quella corrente e le due vicine, le altre restano
          // sulla miniatura da 480 px. Nessuna attesa quando si cambia.
          const distance = Math.min(Math.abs(k - index), total - Math.abs(k - index))
          const cover = distance <= 1 ? w.heroCover : { ...w.heroCover, thumb: w.heroCover.mini }
          return (
            <RouteLink
              to={w.path}
              key={w.id}
              className={k === index ? 'hero__slide is-active' : 'hero__slide'}
              aria-hidden={k !== index}
              tabIndex={k === index ? 0 : -1}
              aria-label={`${w.title}, ${w.year}: apri la scheda`}
            >
              <ArchiveImage item={cover} sizes="(max-width: 860px) 100vw, 72rem" eager={k === index} position={w.heroPos} />
            </RouteLink>
          )
        })}

        {/* l'etichetta che segue il mouse: ←, → o Apri */}
        <span className="hero__cursor" ref={cursorRef} aria-hidden="true">
          <span className="hero__cursor-label">{cursorLabel}</span>
        </span>

        {/* l'avanzamento del lavoro corrente, poi un filetto per ciascuno */}
        <div className="hero__meter" aria-hidden="true">
          <span className="hero__meter-fill" key={index} style={{ animationPlayState: paused ? 'paused' : 'running' }} />
        </div>
        <ol className="hero__dots" role="list">
          {slides.map((w, k) => (
            <li key={w.id}>
              <button type="button" className={k === index ? 'hero__dot is-active' : 'hero__dot'} onClick={() => go(k)} aria-label={`Vai a ${w.title}`} aria-current={k === index ? 'true' : undefined} />
            </li>
          ))}
        </ol>
      </div>

      <div className="hero__bar" aria-live="polite">
        <div className="hero__caption">
          <p className="hero__meta label">
            <span>{current.categoryLabel}</span>
            <span>{current.place ? `${current.place} · ${current.year}` : current.year}</span>
          </p>
          <RouteLink to={current.path} className="hero__title">
            <Split text={current.title} now key={index} />
          </RouteLink>
          <p className="hero__text">{current.kicker}</p>
        </div>
        {/* Le frecce: caratteri, non icone, nello stesso disegno dei titoli. */}
        <div className="hero__nav">
          <span className="hero__count">
            <span className="hero__count-now">{pad2(index + 1)}</span> / {pad2(total)}
          </span>
          <button type="button" className="hero__arrow" onClick={() => go(index - 1)} aria-label="Lavoro precedente">
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="hero__arrow" onClick={() => go(index + 1)} aria-label="Lavoro successivo">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}

function Intro() {
  const onNav = useAnchorNav()

  return (
    <section className="intro" id="top">
      <div className="container">
        <div className="intro__head">
          <div className="intro__title">
            <p className="intro__kicker">
              <span className="intro__rule" aria-hidden="true" />
              Studio tecnico · Mantova
            </p>
            <h1 className="masthead">
              <span className="masthead__pre">Ing.</span>
              <span className="masthead__name">
                <Split text="Dario Donelli" now />
              </span>
            </h1>
          </div>
          <div className="intro__mark" aria-hidden="true">
            <Logo />
          </div>
        </div>

        <div className="intro__sub">
          <p className="infoline">
            {/* Il separatore sta nel CSS, legato alla voce: così il "·" non
                resta mai orfano quando la riga va a capo. */}
            {infoline.map((item) => (
              <span className="infoline__item" key={item}>
                {item}
              </span>
            ))}
          </p>
          <TextLink href="#contatti" onClick={onNav} className="intro__cta">
            Parliamo del progetto <span aria-hidden="true">↗</span>
          </TextLink>
        </div>

        <HeroCarousel />

        {/* L'indice in una riga: i servizi, l'archivio, lo studio. */}
        <nav className="intro__index" aria-label="In breve">
          <div className="intro__index-group">
            <span className="label">Servizi</span>
            <p>
              {serviceAreas.map((area) => (
                <TextLink key={area.id} href="#servizi" onClick={onNav}>
                  {area.title}
                </TextLink>
              ))}
            </p>
          </div>
          <div className="intro__index-group">
            <span className="label">Lavori</span>
            <p>
              {categories.map((c) => (
                <TextLink key={c.id} href="#lavori" onClick={onNav}>
                  {c.label}
                </TextLink>
              ))}
            </p>
          </div>
          <div className="intro__index-group">
            <span className="label">Studio</span>
            <p>
              <TextLink href="#studio" onClick={onNav}>
                Chi sono
              </TextLink>
              <TextLink href="#metodo" onClick={onNav}>
                L’incarico
              </TextLink>
              <TextLink href="#bim" onClick={onNav}>
                BIM
              </TextLink>
              <TextLink href="#contatti" onClick={onNav}>
                Contatti
              </TextLink>
            </p>
          </div>
        </nav>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   01 Servizi
   --------------------------------------------------------------------------- */

function ServicesSection() {
  const onNav = useAnchorNav()

  return (
    <section className="section" id="servizi">
      <div className="container">
        <SectionHead
          id="servizi"
          title="Un unico interlocutore."
          text="Lo studio segue il percorso completo di un intervento edilizio, dalla prima valutazione al cantiere. In base alle esigenze si può attivare una singola prestazione oppure affidare l’intera gestione tecnica."
        />

        <div className="service-cards">
          {serviceAreas.map((area, i) => {
            const item = archiveItem(area.cover)
            const work = lavoriById[area.cover.work]
            return (
              <article key={area.id} className="service-card reveal" style={{ '--i': i }}>
                {/* La fotografia è un lavoro vero dell'archivio e porta alla sua scheda. */}
                <figure className="service-card__media">
                  <RouteLink to={work.path} className="service-card__link" aria-label={`${work.title}: apri la scheda`}>
                    <ArchiveImage item={item} sizes="(max-width: 860px) 100vw, 24rem" />
                  </RouteLink>
                  <figcaption className="service-card__caption">
                    <span className="label">Dall’archivio</span>
                    <RouteLink to={work.path}>
                      {work.title}, {work.year}
                    </RouteLink>
                  </figcaption>
                </figure>

                <div className="service-card__copy">
                  <div className="service-card__top">
                    <span className="service-card__num" aria-hidden="true">
                      {area.num}
                    </span>
                    <h3 className="service-card__title">{area.title}</h3>
                  </div>
                  <p className="body-text">{area.text}</p>
                  <TextLink href="#contatti" onClick={onNav} className="service-card__cta">
                    Parliamo del progetto <span aria-hidden="true">↗</span>
                  </TextLink>
                </div>
              </article>
            )
          })}
        </div>

        <div className="service-index reveal">
          <div className="service-index__head">
            <span className="label">Tutte le prestazioni</span>
            <span className="service-index__count">{pad2(serviceIndex.length)} voci</span>
          </div>
          <ol className="index-list" role="list">
            {serviceIndex.map((item, i) => (
              <li key={item}>
                <span className="index-list__num">{pad2(i + 1)}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   02 Lavori
   L'archivio dei lavori dello studio (src/lavori.js): le tre categorie,
   gli ambiti, poi l'elenco completo che si filtra per categoria. Ogni
   voce porta alla scheda del lavoro e ha un'ancora (#lavoro-<id>) per
   tornarci dalla scheda.
   --------------------------------------------------------------------------- */

function Archive() {
  /* Il primo disegno è uguale a quello del prerender (tutti i lavori): la
     categoria nell'indirizzo si applica prima del primo fotogramma, così
     non c'è né un salto a schermo né un disallineamento di idratazione. */
  const [filter, setFilter] = useState('all')
  const list = filter === 'all' ? lavori : lavori.filter((w) => w.category === filter)
  const activeLabel = categories.find((c) => c.id === filter)?.label

  useIsomorphicLayoutEffect(() => {
    const next = readFilter()
    if (next !== 'all') setFilter(next)
  }, [])

  // quanti lavori per categoria, come nell'elenco dello studio («Strutture (11)»)
  const countOf = (id) => lavori.filter((w) => w.category === id).length

  /* Cambiando filtro le righe della nuova lista sono elementi nuovi, che
     l'osservatore della rivelazione (motion.js) non conosce: resterebbero
     trasparenti. Si mostrano qui, al fotogramma dopo, così la loro entrata
     scaglionata parte dallo stato nascosto invece di saltarlo. */
  const listRef = useRef(null)
  const shownFilter = useRef(filter)
  useEffect(() => {
    if (shownFilter.current === filter) return
    shownFilter.current = filter
    const frame = requestAnimationFrame(() => {
      listRef.current?.querySelectorAll('.reveal:not(.is-visible)').forEach((row) => row.classList.add('is-visible'))
    })
    return () => cancelAnimationFrame(frame)
  }, [filter])

  const choose = (id) => {
    const next = filter === id ? 'all' : id
    setFilter(next)
    window.history.replaceState(window.history.state, '', filterUrl(next))
  }

  return (
    <div className="archive">
      <dl className="categories reveal">
        {categories.map((c) => (
          <div className="categories__item" key={c.id}>
            <dt className="categories__label">
              {c.label} <span className="categories__n">{countOf(c.id)}</span>
            </dt>
            <dd>{c.text}</dd>
          </div>
        ))}
      </dl>

      <p className="ambiti-inline reveal">
        <span className="label">Ambiti</span>
        {ambiti.map((item) => (
          <span className="ambiti-inline__item" key={item}>
            {item}
          </span>
        ))}
      </p>

      {/* Il filtro: bottoni per semantica, collegamenti testuali per aspetto.
          La categoria attiva si richiude cliccandola di nuovo. */}
      <div className="archive__filter reveal" role="group" aria-label="Filtra per categoria">
        {categories.map((c) => (
          <button type="button" key={c.id} className="filter-link" aria-pressed={filter === c.id} onClick={() => choose(c.id)}>
            {c.label} <span className="filter-link__n">{countOf(c.id)}</span>
          </button>
        ))}
        <span className="archive__count" aria-live="polite">
          {pad2(list.length)} {list.length === 1 ? 'lavoro' : 'lavori'}
          {activeLabel && (
            <button type="button" className="archive__reset" onClick={() => choose(filter)}>
              {activeLabel} · mostra tutti
            </button>
          )}
        </span>
      </div>

      <ol className="archive-list" role="list" ref={listRef}>
        {list.map((w, i) => (
          <li key={w.id} id={`lavoro-${w.id}`} className="archive-row reveal" style={{ '--i': i % 6 }}>
            <RouteLink to={w.path} className="archive-row__link">
              <span className="archive-row__year">{w.year}</span>
              <span className="archive-row__figure">
                <img src={w.cover.mini} alt="" width="96" height="72" loading="lazy" decoding="async" />
              </span>
              <span className="archive-row__body">
                <span className="archive-row__title">{w.title}</span>
                <span className="archive-row__kicker">{w.kicker}</span>
              </span>
              <span className="archive-row__cat">{w.categoryLabel}</span>
              <span className="archive-row__place">{w.place || ''}</span>
              <span className="archive-row__go" aria-hidden="true">
                ↗
              </span>
            </RouteLink>
          </li>
        ))}
      </ol>
    </div>
  )
}

function LavoriSection() {
  return (
    <section className="section section--surface" id="lavori">
      <div className="container">
        <SectionHead id="lavori" title="I lavori dello studio." />
        <Archive />
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   03 Lo Studio
   --------------------------------------------------------------------------- */

function StudioSection() {
  return (
    <section className="section" id="studio">
      <div className="container">
        <SectionHead id="studio" title="Un unico riferimento dal progetto al cantiere." />

        <div className="studio-layout">
          <aside className="studio__rail">
            {/* La targa vera, quella all'ingresso dello studio: porta già
                marchio, nome e le due righe di specializzazione. */}
            <figure className="studio__plate reveal">
              <Photo
                base="/images/hero-targa"
                ext="png"
                alt="La targa dello studio: Ing. Dario Donelli, ingegneria, architettura, ambiente, progettazione integrale e coordinata"
                width="1489"
                height="967"
              />
              <figcaption className="studio__plate-caption">
                <span className="label">La targa dello studio</span>
                <span>Via Filippo Turati 1, Rivalta sul Mincio</span>
              </figcaption>
            </figure>
            <h3 className="label">Discipline</h3>
            <ol className="rail-list" role="list">
              {disciplines.map((item, i) => (
                <li key={item}>
                  <span className="rail-list__num">{pad2(i + 1)}</span>
                  {item}
                </li>
              ))}
            </ol>
          </aside>

          <div className="studio__main">
            <p className="studio__intro reveal">Unico interlocutore dalle valutazioni preliminari alle esecuzioni in cantiere.</p>

            <div className="studio__bio">
              {profile.bio.map((paragraph) => (
                <p className="body-text" key={paragraph.slice(0, 32)}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Profilo tecnico impostato come scheda, non come paragrafo. */}
            <dl className="datasheet reveal">
              {profile.credentials.map((row) => (
                <div className="datasheet__row" key={row.label}>
                  <dt className="label">{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
              <div className="datasheet__row">
                <dt className="label">Sede</dt>
                <dd>{studio.address}</dd>
              </div>
            </dl>

            {/* Le collaborazioni: solo i nomi presenti in content.js. */}
            <section className="collab reveal" aria-labelledby="collab-title">
              <div className="collab__head">
                <span className="label">Collaborazioni</span>
                <h3 id="collab-title" className="collab__title">
                  Con chi lavoro
                </h3>
              </div>
              <p className="body-text">{collaborators.text}</p>
              <dl className="collab__list">
                <div className="collab__row">
                  <dt className="label">Collaboratori</dt>
                  <dd>
                    {collaborators.technicians.map((person) => (
                      <span key={person.name}>
                        {person.name}
                        <span className="collab__role">{person.role}</span>
                      </span>
                    ))}
                  </dd>
                </div>
                <div className="collab__row">
                  <dt className="label">Imprese</dt>
                  <dd className="collab__empty">{collaborators.companies.length ? collaborators.companies.join(' · ') : collaborators.note}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>

      {/* La sede: fotografia larga, ferma, con la didascalia sul filetto. */}
      <div className="container">
        <figure className="studio-photo reveal media-reveal">
          <Photo
            base="/images/studio-esterno"
            alt="L'edificio d'angolo che ospita lo studio, con la vetrina e l'ingresso su strada"
            width="1600"
            height="1067"
          />
          <figcaption className="studio-photo__caption">
            <span className="label">La sede</span>
            <span>
              Via Filippo Turati 1, Rivalta sul Mincio — alle porte del Parco del Mincio, attività in tutta la provincia di
              Mantova.
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   04 L'incarico
   --------------------------------------------------------------------------- */

function MethodSection() {
  return (
    <section className="section section--surface" id="metodo">
      <div className="container">
        <SectionHead id="metodo" title="L’incarico." />
        <ol className="method reveal" role="list">
          {method.map((step) => (
            <li key={step.num} className="method__step">
              <span className="method__num" aria-hidden="true">
                {step.num}
              </span>
              <h3 className="method__title">{step.title}</h3>
              <p className="method__text">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   05 BIM
   Un disegno tecnico che si traccia da sé quando entra nello schermo:
   assonometria di un edificio a tre piani. Nessuna promessa: la sezione
   dichiara che il percorso è in preparazione.
   --------------------------------------------------------------------------- */

function BimDrawing() {
  const levels = [0, 55, 110, 165]
  const plane = (d) => `M260 ${460 - d} 470 ${340 - d} 260 ${220 - d} 50 ${340 - d}Z`

  return (
    <svg className="bim-drawing" viewBox="0 0 520 500" fill="none" aria-hidden="true">
      {/* Il piano di campagna: un solo segno, appena percettibile. */}
      <path className="bim-drawing__base" d={plane(0)} stroke="currentColor" strokeWidth="0.8" />

      <g className="bim-drawing__ink" stroke="currentColor" strokeLinecap="square">
        {/* Tre impalcati e la copertura. */}
        {[55, 110, 165].map((d, i) => (
          <path
            key={`piano-${d}`}
            className="bim-drawing__line"
            pathLength="1"
            d={plane(d)}
            style={{ '--d': i * 0.1 }}
            fill={i === 2 ? 'currentColor' : 'none'}
            fillOpacity={i === 2 ? 0.045 : undefined}
          />
        ))}

        {/* I pilastri d'angolo: i tre in vista, quello dietro tratteggiato. */}
        {[
          `M260 460V295`,
          `M470 340V175`,
          `M50 340V175`,
        ].map((d, i) => (
          <path key={d} className="bim-drawing__line" pathLength="1" d={d} style={{ '--d': 0.3 + i * 0.08 }} />
        ))}
        <path className="bim-drawing__ghost" d="M260 220V55" />

        {/* Le quote di piano, sul fianco sinistro. */}
        <g className="bim-drawing__quotes" strokeWidth="0.8">
          {levels.map((d) => (
            <path key={`quota-${d}`} d={`M36 ${340 - d}H50`} />
          ))}
          <path d="M36 340V175" />
        </g>
      </g>

      <g className="bim-drawing__points" fill="currentColor">
        {[
          [50, 340],
          [260, 460],
          [470, 340],
          [260, 220],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />
        ))}
      </g>
    </svg>
  )
}

function BimSection() {
  return (
    <section className="section" id="bim">
      <div className="container">
        <SectionHead id="bim" title={bim.title} text={bim.text} badge={bim.status} />

        <div className="bim">
          <div className="bim__drawing reveal">
            <span className="bim__drawing-label label">Assonometria · modello coordinato</span>
            <BimDrawing />
          </div>
          <ol className="bim__points" role="list">
            {bim.points.map((point, i) => (
              <li key={point.title} className="bim__point reveal" style={{ '--i': i }}>
                <span className="bim__point-num">{pad2(i + 1)}</span>
                <h3 className="bim__point-title">{point.title}</h3>
                <p className="bim__point-text">{point.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   06 Contatti
   --------------------------------------------------------------------------- */

function MapCard() {
  return (
    <div className="map">
      <iframe
        className="map__frame"
        src={mapEmbedSrc}
        title="Mappa della posizione dello studio a Rivalta sul Mincio"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

function ContactSection() {
  return (
    <section className="section section--surface" id="contatti">
      <div className="container">
        <SectionHead
          id="contatti"
          title="Parliamo del progetto."
          text="Il primo contatto serve a capire se e come posso essere utile. Una telefonata o una mail sono sufficienti per fissare un sopralluogo."
        />

        <div className="contact-grid">
          <ul className="contact-list reveal" role="list">
            <li className="contact-item">
              <span className="label">Telefono</span>
              <a className="contact-item__value" href={studio.phoneHref}>
                {studio.phoneDisplay}
              </a>
              <span className="contact-item__note">Risponde direttamente lo studio</span>
            </li>
            <li className="contact-item">
              <span className="label">Email</span>
              <MailLink
                user={studio.emailUser}
                domain={studio.emailDomain}
                className="contact-item__value contact-item__value--break"
                label="Scrivi allo studio"
              />
              <span className="contact-item__note">Descriva l&rsquo;immobile e cosa ha in mente</span>
            </li>
            <li className="contact-item">
              <span className="label">PEC</span>
              <MailLink
                user={studio.pecUser}
                domain={studio.pecDomain}
                className="contact-item__value contact-item__value--break"
                label="Scrivi alla PEC dello studio"
              />
              <span className="contact-item__note">Per le comunicazioni ufficiali</span>
            </li>
            <li className="contact-item">
              <span className="label">Studio</span>
              <span className="contact-item__value">
                {studio.addressLines[0]}
                <br />
                {studio.addressLines[1]}
              </span>
              <span className="contact-item__note">All&rsquo;angolo tra via Turati e vicolo Zibramonda</span>
            </li>
          </ul>

          <div className="contact__map-col reveal">
            <MapCard />
            <p className="map__links">
              <TextLink href={studio.mapsHref} target="_blank" rel="noopener noreferrer">
                Itinerario su Google Maps
              </TextLink>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   Footer
   --------------------------------------------------------------------------- */

function Footer() {
  const year = new Date().getFullYear()
  const onNav = useAnchorNav()

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__main">
          <div className="footer__brand">
            <span className="label">Studio</span>
            <p className="footer__name">{studio.name}</p>
            <p className="footer__address">
              {studio.addressLines[0]}
              <br />
              {studio.addressLines[1]}
            </p>
            <a className="footer__maps" href={studio.mapsHref} target="_blank" rel="noopener noreferrer">
              Itinerario <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="footer__block">
            <span className="label">Recapiti</span>
            <ul role="list">
              <li>
                <a href={studio.phoneHref}>{studio.phoneDisplay}</a>
              </li>
              <li>
                <MailLink user={studio.emailUser} domain={studio.emailDomain} className="footer__break" label="Scrivi allo studio" />
              </li>
              <li>
                <MailLink user={studio.pecUser} domain={studio.pecDomain} className="footer__break" label="Scrivi alla PEC dello studio" />
                <span className="footer__kind">PEC</span>
              </li>
            </ul>
          </div>

          <nav className="footer__block" aria-label="Sezioni del sito">
            <span className="label">Sezioni</span>
            <ul role="list">
              {sections.map((item) => (
                <li key={item.id}>
                  <a href={`/#${item.id}`} onClick={onNav}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="footer__legal">
          <p>Ordine degli Ingegneri di Mantova · n. 1495 · 24 maggio 2010 · Settore a) civile e ambientale</p>
          <p>
            P. IVA {studio.vat} · C.F. {studio.taxCode} · SDI {studio.sdi}
          </p>
        </div>

        <div className="footer__meta">
          <span>
            © {year} {studio.name}
          </span>
          <span className="footer__credit">
            Designed by{' '}
            <a href="https://www.albertopecchini.it" target="_blank" rel="noopener noreferrer" title="Alberto Pecchini">
              Alberto
            </a>{' '}
            in Rivalta sul Mincio
          </span>
          <button type="button" className="footer__top" onClick={backToTop}>
            Torna su <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>
    </footer>
  )
}

/* ---------------------------------------------------------------------------
   Scheda di un lavoro
   Titolo e sottotitolo, la copertina, la scheda tecnica accanto al testo,
   poi il visualizzatore con tutte le tavole e le fotografie e, sotto,
   l'indice visivo: ogni miniatura apre il suo file nel visualizzatore.
   In fondo, il lavoro precedente e il successivo nell'archivio.
   --------------------------------------------------------------------------- */

function WorkBack({ work }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setVisible(window.scrollY > 900)
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className={`work-back${visible ? ' is-visible' : ''}`}>
      <RouteLink to="/" hash={`lavoro-${work.id}`} className="work-back__link">
        <span aria-hidden="true">←</span> Tutti i lavori
      </RouteLink>
    </div>
  )
}

function WorkPage({ work }) {
  const { prev, next } = neighbours(work.id)
  const rows = [
    ['Anno', String(work.year)],
    ['Categoria', work.categoryLabel],
    work.client && ['Committente', work.client],
    work.place && ['Luogo', work.place],
    ['Prestazione', work.role],
  ].filter(Boolean)
  const archiveLink = { to: '/', hash: `lavoro-${work.id}` }

  return (
    <article className="work">
      <header className="work__head">
        <div className="container">
          <p className="work__crumbs label">
            <RouteLink {...archiveLink}>Lavori</RouteLink>
            <span aria-hidden="true">/</span>
            <span>{work.categoryLabel}</span>
            <span aria-hidden="true">/</span>
            <span>{work.year}</span>
          </p>
          <p className="work__no label">
            Scheda {pad2(work.index)} / {pad2(lavori.length)}
          </p>
          <h1 className="work__title">
            <Split text={work.title} now />
          </h1>
          <p className="work__kicker lead">{work.kicker}</p>
        </div>
      </header>

      <div className="container">
        <figure className="work__cover media-reveal media-reveal--now">
          <ArchiveImage item={work.cover} sizes="(max-width: 860px) 100vw, 72rem" eager />
          <figcaption className="work__cover-caption">
            <span className="label">{work.cover.tag === 'Foto' ? 'Fotografia' : 'Tavola'}</span>
            <span>{work.cover.title}</span>
          </figcaption>
        </figure>

        <div className="work__grid">
          <dl className="datasheet work__sheet reveal">
            {rows.map(([label, value]) => (
              <div className="datasheet__row" key={label}>
                <dt className="label">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="work__text">
            {work.text.map((paragraph) => (
              <p className="body-text" key={paragraph.slice(0, 40)}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="drawings work__viewer">
          <div className="drawings__head reveal">
            <span className="label">Tavole e fotografie</span>
            <h2 className="drawings__title">
              {work.counts.pages > 0 ? 'Le tavole originali e le fotografie, da sfogliare qui.' : 'Le fotografie, da sfogliare qui.'}
            </h2>
            <p className="body-text">
              {work.counts.pages > 0 &&
                'Le tavole sono i PDF così come sono stati stampati, con i dati personali del cartiglio oscurati: si ingrandiscono fino al singolo ferro e alla singola quota. '}
              Le fotografie si ingrandiscono allo stesso modo. Ctrl e rotella o due dita per avvicinarsi, frecce per cambiare file.
            </p>
          </div>
          <SheetViewer sheets={work.items} label={`Tavole e fotografie: ${work.title}`} />
        </div>

        <nav className="work__nav reveal" aria-label="Altri lavori">
          {prev ? (
            <RouteLink to={prev.path} className="work__nav-link">
              <span className="label">Precedente · {prev.year}</span>
              <span className="work__nav-title">{prev.title}</span>
            </RouteLink>
          ) : (
            <span />
          )}
          <RouteLink {...archiveLink} className="work__nav-all text-link">
            Tutti i lavori
          </RouteLink>
          {next ? (
            <RouteLink to={next.path} className="work__nav-link work__nav-link--next">
              <span className="label">Successivo · {next.year}</span>
              <span className="work__nav-title">{next.title}</span>
            </RouteLink>
          ) : (
            <span />
          )}
        </nav>
      </div>

      <WorkBack work={work} />
    </article>
  )
}

function MissingPage() {
  return (
    <section className="work work--missing">
      <div className="container">
        <p className="label">Pagina non trovata</p>
        <h1 className="work__title">Qui non c’è nulla.</h1>
        <p className="lead">L’indirizzo non corrisponde a nessuna pagina del sito.</p>
        <p className="work__missing-links">
          <RouteLink to="/" className="text-link">
            Torna all’inizio
          </RouteLink>
          <RouteLink to="/" hash="lavori" className="text-link">
            Tutti i lavori
          </RouteLink>
        </p>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------------
   Switcher tipografico (solo sviluppo)
   Un pannello in basso a destra per provare i preset dei caratteri. Non
   entra nella build di produzione: `import.meta.env.DEV` è falso lì, e il
   componente viene tolto dal bundle.
   --------------------------------------------------------------------------- */

const FONT_PRESETS = [
  { id: 'studio', label: 'Studio', display: 'Inter Tight', serif: 'Fraunces', sans: 'Inter' },
  { id: 'archivio', label: 'Archivio', display: 'Archivo', serif: 'Newsreader', sans: 'Archivo' },
  { id: 'tecnico', label: 'Tecnico', display: 'Space Grotesk', serif: 'Instrument Serif', sans: 'Inter' },
  { id: 'editoriale', label: 'Editoriale', display: 'Bricolage Grotesque', serif: 'Spectral', sans: 'Public Sans' },
  { id: 'umanista', label: 'Umanista', display: 'Manrope', serif: 'Lora', sans: 'Manrope' },
  { id: 'plex', label: 'Plex', display: 'IBM Plex Sans', serif: 'IBM Plex Serif', sans: 'IBM Plex Sans' },
]

function FontSwitcher() {
  const [font, setFont] = useState(() => {
    try {
      return localStorage.getItem('font-preset') || 'studio'
    } catch {
      return 'studio'
    }
  })

  useEffect(() => {
    document.documentElement.dataset.font = font
    try {
      localStorage.setItem('font-preset', font)
    } catch {
      /* niente: la scelta vale solo per questa visita */
    }
  }, [font])

  const current = FONT_PRESETS.find((preset) => preset.id === font) || FONT_PRESETS[0]

  return (
    <details className="font-switcher">
      <summary className="font-switcher__toggle">
        <span className="font-switcher__sample" aria-hidden="true">
          Aa
        </span>
        <span>Caratteri · {current.label}</span>
      </summary>
      <div className="font-switcher__panel">
        <p className="font-switcher__title">Solo in locale. La scelta resta in questo browser.</p>
        <div className="font-switcher__list" role="group" aria-label="Preset tipografici">
          {FONT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`font-switcher__item${preset.id === font ? ' is-active' : ''}`}
              aria-pressed={preset.id === font}
              onClick={() => setFont(preset.id)}
            >
              <span className="font-switcher__name" style={{ fontFamily: `'${preset.display}', system-ui, sans-serif` }}>
                {preset.label}
              </span>
              <span className="font-switcher__meta">
                {preset.display} · {preset.serif} · {preset.sans}
              </span>
            </button>
          ))}
        </div>
      </div>
    </details>
  )
}

/* ---------------------------------------------------------------------------
   Composizione
   --------------------------------------------------------------------------- */

const legacyHashes = { progetti: 'lavori', territorio: 'lavori', ambiti: 'lavori' }

function Home() {
  return (
    <>
      <Intro />
      <ServicesSection />
      <LavoriSection />
      <StudioSection />
      <MethodSection />
      <BimSection />
      <ContactSection />
    </>
  )
}

function Layout({ url }) {
  const [path, setPath] = useState(() => resolve(url).path)
  const pendingHash = useRef(null)
  const pendingScroll = useRef(null)
  const page = useMemo(() => resolve(path), [path])

  useReveal(path)

  const navigate = useCallback((to, hash = null, { search = '' } = {}) => {
    const target = resolve(to).path
    // La voce che si lascia ricorda dove si era: il tasto indietro la riapre lì.
    window.history.replaceState({ ...(window.history.state || {}), scrollY: window.scrollY }, '')
    pendingHash.current = hash
    pendingScroll.current = null
    const query = search ? `?${search}` : ''
    const url = `${target}${query}${hash ? `#${hash}` : ''}`
    window.history.pushState({ path: target, hash, scrollY: 0 }, '', url)
    setPath(target)
  }, [])

  // Il tasto indietro: la pagina torna quella dell'indirizzo, alla quota
  // in cui la si era lasciata.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    const onPop = () => {
      const state = window.history.state
      const hash = window.location.hash.slice(1) || null
      pendingHash.current = state?.hash || hash
      pendingScroll.current = typeof state?.scrollY === 'number' ? state.scrollY : null
      setPath(resolve(window.location.pathname).path)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Primo arrivo: gli indirizzi della versione precedente del sito restano
  // vivi, e un'ancora nell'indirizzo porta alla sua sezione.
  useEffect(() => {
    const legacy = legacyPaths[window.location.pathname.replace(/\/$/, '')]
    const hash = window.location.hash.slice(1)
    const target = legacy || legacyHashes[hash] || hash
    if (legacy) window.history.replaceState(window.history.state, '', `/#${legacy}`)
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      if (document.getElementById(target)) scrollToTarget(target, { immediate: true })
    })
    // Le immagini hanno le misure, ma i font possono spostare le righe:
    // un secondo passaggio a pagina caricata tiene l'ancora al posto giusto.
    const onLoad = () => {
      if (document.getElementById(target)) scrollToTarget(target, { immediate: true })
    }
    window.addEventListener('load', onLoad, { once: true })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('load', onLoad)
    }
  }, [])

  // A ogni cambio di pagina: titolo e metadati, posizione, fuoco sul
  // contenuto. Il primo arrivo è già sistemato dal browser.
  const first = useRef(true)
  useEffect(() => {
    applyPageMeta(page)
    if (first.current) {
      first.current = false
      return
    }
    const y = pendingScroll.current
    const hash = pendingHash.current
    pendingScroll.current = null
    pendingHash.current = null
    const frame = window.requestAnimationFrame(() => {
      if (typeof y === 'number' && y > 0) scrollToTarget(y, { immediate: true })
      else if (hash && document.getElementById(hash)) scrollToTarget(hash, { immediate: true })
      else scrollToTarget(0, { immediate: true })
      document.getElementById('contenuto')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [path, page])

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      <a className="skip-link" href="#contenuto">
        Salta al contenuto
      </a>

      <Header />

      <main className="site-main" id="contenuto" tabIndex={-1}>
        <div className="site-page" key={page.path}>
          {page.kind === 'work' ? <WorkPage work={page.work} /> : page.kind === 'missing' ? <MissingPage /> : <Home />}
        </div>
      </main>

      <Footer />

      {import.meta.env.DEV && <FontSwitcher />}
    </RouterContext.Provider>
  )
}

/**
 * @param {{ url?: string }} props `url`: percorso della pagina da mostrare,
 *   quello dell'indirizzo nel browser o quello chiesto dal prerender
 */
export default function App({ url = '/' }) {
  return <Layout url={url} />
}

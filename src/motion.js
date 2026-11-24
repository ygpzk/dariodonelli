import { useEffect } from 'react'

/* ---------------------------------------------------------------------------
   Movimento
   Gli aiuti che fanno muovere il sito mentre si scorre. Lo scorrimento è
   quello nativo del browser: nessuna inerzia aggiunta. Il resto (come si
   muove) è negli stili di .reveal in App.css.
   --------------------------------------------------------------------------- */

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Lo stesso scarto dell'header che usa scroll-padding-top in index.css. */
const HEADER_OFFSET = 88

/**
 * Porta la pagina a un punto: l'id di una sezione, un elemento o una quota
 * in pixel. Con `immediate` il salto è istantaneo (cambio pagina, arrivo da
 * un indirizzo con ancora); altrimenti il browser scorre da solo.
 */
export function scrollToTarget(target, { immediate = false } = {}) {
  const el = typeof target === 'string' ? document.getElementById(target) : target
  const top = typeof el === 'number' ? el : el ? el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET : 0
  window.scrollTo({ top, behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' })
}

/**
 * Rivelazione allo scroll. Un solo observer per tutti gli elementi .reveal:
 * la linea di attivazione sta al 14% dal fondo dello schermo, così
 * l'animazione parte quando l'elemento si vede davvero. Arrivati in fondo
 * alla pagina quella linea non si raggiunge più: ciò che è sullo schermo
 * si mostra comunque, e non si perde nulla.
 */
/**
 * @param {string} [route] la pagina corrente: cambiando pagina il contenuto
 *   è nuovo e l'osservatore riparte sui nuovi elementi .reveal
 */
export function useReveal(route) {
  useEffect(() => {
    const nodes = [...document.querySelectorAll('.reveal:not(.is-visible)')]
    if (!nodes.length) return
    const show = (node) => node.classList.add('is-visible')
    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach(show)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -14% 0px', threshold: 0 },
    )
    nodes.forEach((node) => observer.observe(node))

    // Tabulando, il focus può posarsi su un collegamento dentro un blocco
    // non ancora rivelato (il browser lo porta appena dentro la finestra,
    // sotto la linea di attivazione): il blocco si mostra subito.
    const onFocus = (event) => {
      const host = event.target.closest?.('.reveal:not(.is-visible)')
      if (host) {
        show(host)
        observer.unobserve(host)
      }
    }
    document.addEventListener('focusin', onFocus)

    let frame = 0
    const atBottom = () => {
      frame = 0
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - 8) return
      nodes.forEach((node) => {
        if (node.classList.contains('is-visible')) return
        if (node.getBoundingClientRect().top < window.innerHeight) {
          show(node)
          observer.unobserve(node)
        }
      })
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(atBottom)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('focusin', onFocus)
    }
  }, [route])
}

/**
 * Le pagine del sito e i loro metadati.
 *
 * Il sito resta una pagina sola per tutto ciò che riguarda lo studio; ogni
 * lavoro dell'archivio ha però un suo indirizzo, /lavori/<id>, così che si
 * possa condividere, ritrovare e indicizzare. Qui si decide quale pagina
 * corrisponde a un percorso e quali titolo, descrizione e immagine di
 * anteprima le spettano: li usano App.jsx (titolo della scheda aperta nel
 * browser) e plugins/prerender.js (HTML statico di ogni pagina, sitemap).
 */

import { siteUrl, studio } from './content.js'
import { lavori, lavoriById } from './lavori.js'

export const HOME = {
  kind: 'home',
  path: '/',
  title: 'Ing. Dario Donelli | Studio tecnico a Rivalta sul Mincio (MN)',
  description:
    'Studio tecnico dell’Ing. Dario Donelli a Rivalta sul Mincio (Mantova): progettazione architettonica e strutturale, sicurezza sismica, riqualificazione energetica e direzione lavori. L’archivio dei lavori dello studio.',
  image: `${siteUrl}/images/hero-targa-og.jpg`,
  imageAlt: 'La targa dello studio Ing. Dario Donelli',
}

/**
 * Gli indirizzi della versione precedente del sito restano vivi: si apre la
 * pagina principale e un effetto porta alla sezione giusta.
 */
export const legacyPaths = {
  '/servizi': 'servizi',
  '/progetti': 'lavori',
  '/studio': 'studio',
  '/contatti': 'contatti',
}

/** Percorso → pagina. Un lavoro inesistente dà la pagina «non trovato». */
export function resolve(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/' || legacyPaths[path]) return HOME
  const m = path.match(/^\/lavori\/([a-z0-9-]+)$/)
  if (m) {
    const work = lavoriById[m[1]]
    if (work) {
      return {
        kind: 'work',
        path: work.path,
        work,
        title: `${work.title} (${work.year}) | ${studio.name}`,
        description: work.summary,
        image: `${siteUrl}${work.cover.thumb}`,
        imageAlt: `${work.title}: ${work.cover.title}`,
      }
    }
  }
  return {
    kind: 'missing',
    path,
    title: `Pagina non trovata | ${studio.name}`,
    description: HOME.description,
    image: HOME.image,
    imageAlt: HOME.imageAlt,
  }
}

/** Tutti i percorsi da prerenderizzare e da mettere in sitemap. */
export const routes = ['/', ...lavori.map((w) => w.path)]

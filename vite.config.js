import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import prerender from './plugins/prerender.js'
import { siteUrl } from './src/content.js'

/**
 * L'indirizzo pubblico sta in `siteUrl` (src/content.js). Questo plugin lo
 * scrive nei tag di index.html (%SITE_URL%) in sviluppo e in build, così
 * dominio, canonical e anteprime di condivisione hanno una sola fonte.
 */
function siteUrlPlugin() {
  return {
    name: 'site-url',
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', siteUrl)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), prerender(), siteUrlPlugin()],
  build:
    mode === 'ssr'
      ? {
          // Build separata, in Node, usata solo dal prerender.
          ssr: 'src/entry-server.jsx',
          outDir: 'dist-ssr',
          emptyOutDir: true,
        }
      : {},
}))

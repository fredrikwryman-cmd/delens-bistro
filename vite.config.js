import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statiskHtml } from './verktyg/statisk.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Inline PostCSS-config stänger av uppsökningen. Utan den vandrar Vite
  // uppåt till C:\Users\fredr\postcss.config.js, som kräver
  // @tailwindcss/postcss och får all CSS att svara 500.
  css: { postcss: { plugins: [] } },
  // Meny, öppettider och kontaktuppgifter skrivs in i HTML:en ur
  // menu.js, så att de syns utan JavaScript. Se verktyg/statisk.mjs.
  plugins: [statiskHtml()],
  // Flersida. Utan input-listan bygger Vite bara index.html och
  // integritetspolicyn skulle saknas i utdatan — en död länk i footern
  // på varje sida.
  build: {
    rollupOptions: {
      input: {
        start: resolve(__dirname, 'index.html'),
        integritetspolicy: resolve(__dirname, 'integritetspolicy.html'),
        omOss: resolve(__dirname, 'om-oss.html'),
        // GitHub Pages svarar med 404.html på varje adress som inte finns.
        saknas: resolve(__dirname, '404.html')
      }
    }
  },
  server: { host: true, port: 5173 }
});

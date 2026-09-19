import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Inline PostCSS-config stänger av uppsökningen. Utan den vandrar Vite
  // uppåt till C:\Users\fredr\postcss.config.js, som kräver
  // @tailwindcss/postcss och får all CSS att svara 500.
  css: { postcss: { plugins: [] } },
  // Flersida. Utan input-listan bygger Vite bara index.html och
  // integritetspolicyn skulle saknas i utdatan — en död länk i footern
  // på varje sida.
  build: {
    rollupOptions: {
      input: {
        start: resolve(__dirname, 'index.html'),
        integritetspolicy: resolve(__dirname, 'integritetspolicy.html')
      }
    }
  },
  server: { host: true, port: 5173 }
});

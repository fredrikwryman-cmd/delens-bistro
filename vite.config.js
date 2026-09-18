import { defineConfig } from 'vite';

export default defineConfig({
  // Inline PostCSS-config stänger av uppsökningen. Utan den vandrar Vite
  // uppåt till C:\Users\fredr\postcss.config.js, som kräver
  // @tailwindcss/postcss och får all CSS att svara 500.
  css: { postcss: { plugins: [] } },
  server: { host: true, port: 5173 }
});

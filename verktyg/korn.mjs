/**
 * Filmkorn för scroll-sekvensen.
 *
 *   node verktyg/korn.mjs
 *
 * VARFÖR KORN. Rutorna är 1280 px, alltså källans tak, men på en vy
 * som är bredare än så förstoras de ändå — och WebP vid kvalitet 66
 * lämnar mjuka fält i rök och neonglöd där banding och blockkanter
 * syns. Ett jämnt brus över hela bilden ger ögat en struktur att
 * läsa, och då läses de mjuka fälten som film i stället för som dålig
 * kvalitet. Kornet döljer ingenting tekniskt; det byter ut ett
 * oregelbundet fel mot ett regelbundet mönster, och ögat förlåter det
 * regelbundna.
 *
 * TVÅ TONER, INTE EN. Riktigt korn både ljusnar och mörknar bilden.
 * En ren vit brusruta hade bara kunnat ljusna, och resultatet blir
 * disigt i stället för kornigt — det är den vanligaste missen. Här är
 * halva pixlarna ljusa och halva mörka, och alfan bär styrkan.
 *
 * DÄRFÖR OCKSÅ INGEN mix-blend-mode. Ett blandningsläge över en duk
 * som fyller hela vyn tvingar kompositören att läsa tillbaka
 * underlaget varje bildruta, och sekvensen ritar redan varje
 * bildruta. Med två toner i alfa räcker vanlig genomskinlighet, och
 * lagret kan ligga kvar på GPU:n utan att röra duken.
 *
 * STORLEKEN ÄR 160. Brus kaklar sömlöst av sig självt — varje pixel
 * är oberoende, så det finns ingen kant att matcha. Men ÖGAT hittar
 * upprepningen om rutan är liten. Brus komprimerar dessutom uselt,
 * vilket är hela poängen med brus, så varje fördubbling av sidan
 * kostar fyra gånger vikten. Uppmätt som lossless WebP:
 *
 *   96 px 9,5 kB · 128 px 16,8 · 160 px 26,2 · 192 px 37,7 · 256 px 66,9
 *
 * Vid 6 procents opacitet är upprepningen osynlig långt under 160,
 * men 160 ger marginal om nivån skruvas upp, och 26 kB mot sekvensens
 * 4,7 MB är ingenting.
 *
 * LOSSLESS WEBP, INTE PNG. Uppmätt på samma ruta väger WebP 26,2 kB
 * mot PNG:s 36,2 — 28 procent lättare, och samma förhållande håller i
 * alla storlekar ovan. Förlustgivande WebP är däremot uteslutet: det
 * skulle jämna ut precis det som ska vara ojämnt.
 */

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const MAL = 'public/bilder/korn';
const FIL = 'korn.webp';
const SIDA = 160;

/**
 * Två likformiga tal till ett normalfördelat, Box–Muller.
 * Normalfördelat brus ser ut som film; likformigt ser ut som tv-snö.
 */
function normal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

async function kor() {
  await mkdir(MAL, { recursive: true });

  const data = Buffer.alloc(SIDA * SIDA * 4);
  let ljusa = 0;
  let summaAlfa = 0;

  for (let i = 0; i < SIDA * SIDA; i++) {
    // Sprid runt noll och klipp svansarna. 78 är vald så att typisk
    // alfa hamnar kring 60 av 255: lagret bär sin styrka i alfan och
    // CSS skalar ned den ytterligare med opacity.
    const n = Math.max(-3, Math.min(3, normal())) * 78;
    const ljus = n >= 0;
    const alfa = Math.min(255, Math.round(Math.abs(n)));
    const ton = ljus ? 255 : 0;
    if (ljus) ljusa++;
    summaAlfa += alfa;

    const p = i * 4;
    data[p] = ton;
    data[p + 1] = ton;
    data[p + 2] = ton;
    data[p + 3] = alfa;
  }

  const ut = path.join(MAL, FIL);
  await sharp(data, { raw: { width: SIDA, height: SIDA, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toFile(ut);

  const b = (await stat(ut)).size;
  console.log(`${FIL}  ${SIDA}×${SIDA}  ${(b / 1024).toFixed(1)} kB`);
  console.log(
    `ljusa ${((ljusa / (SIDA * SIDA)) * 100).toFixed(1)} procent, ` +
      `snittalfa ${(summaAlfa / (SIDA * SIDA)).toFixed(0)} av 255`
  );
}

kor();

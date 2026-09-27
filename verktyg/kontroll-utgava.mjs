/**
 * Spärrkontroll före publicering.
 *
 *   node verktyg/kontroll-utgava.mjs
 *
 * PLAN.md avsnitt 12 kräver en kontroll före varje deploy: metataggen
 * ska finnas i ALLA byggda HTML-filer i dist/, inte bara i källfilerna.
 * "En ingång som glömts bort är exakt den som hamnar i indexet."
 *
 * Den kontrollen är värdelös som rutin man ska komma ihåg. Här är den
 * ett skript som avslutar med felkod, och arbetsflödet kör det mellan
 * bygget och publiceringen — går det inte igenom publiceras ingenting.
 *
 * FYRA SAKER KONTROLLERAS.
 *
 *   1. Varje .html i dist/ bär <meta name="robots" content="noindex…">.
 *      Filerna räknas upp ur dist/, inte ur en lista här — en ny ingång
 *      som läggs till i vite.config fångas då automatiskt.
 *   2. dist/robots.txt finns och stänger allt.
 *   3. dist/CNAME finns och innehåller rätt värdnamn. Vid publicering
 *      från ett Actions-arbetsflöde ignorerar Pages filen — där är det
 *      Custom domain i repots inställningar som gäller, se PLAN.md 11.
 *      Kontrollen står kvar så filen inte glider isär från
 *      inställningen, och för en eventuell omställning till gren.
 *   4. Ingen sitemap har smugit sig in.
 *
 * Skriptet SÄGER INTE ifrån om spärren ska släppas. Det gör Fredrik,
 * uttryckligen, och då är det den här filen som ska ändras i samma
 * commit — se avsnitt 12 om hur släppet går till.
 */

import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const VARDNAMN = 'delens.aimstudios.se';

/** <meta name="robots" content="noindex, nofollow"> i valfri stavning. */
const NOINDEX =
  /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["']/i;

const fel = [];
const ok = [];

async function htmlFiler(mapp) {
  const ut = [];
  for (const post of await readdir(mapp, { withFileTypes: true })) {
    const p = path.join(mapp, post.name);
    if (post.isDirectory()) ut.push(...(await htmlFiler(p)));
    else if (post.name.endsWith('.html')) ut.push(p);
  }
  return ut;
}

async function kor() {
  try {
    await access(DIST);
  } catch {
    fel.push(`${DIST}/ saknas — kör bygget först`);
    return;
  }

  // 1 · Metataggen i varje byggd HTML-fil.
  const filer = await htmlFiler(DIST);
  if (!filer.length) fel.push('inga HTML-filer i dist/ — byggde det något?');
  for (const f of filer) {
    const txt = await readFile(f, 'utf8');
    if (NOINDEX.test(txt)) ok.push(`noindex  ${f}`);
    else fel.push(`SAKNAR noindex: ${f}`);
  }

  // 2 · robots.txt stänger allt.
  try {
    const r = await readFile(path.join(DIST, 'robots.txt'), 'utf8');
    if (/^\s*Disallow:\s*\/\s*$/im.test(r)) ok.push('robots.txt stänger allt');
    else fel.push('robots.txt saknar "Disallow: /"');
  } catch {
    fel.push('dist/robots.txt saknas');
  }

  // 3 · CNAME pekar rätt.
  try {
    const c = (await readFile(path.join(DIST, 'CNAME'), 'utf8')).trim();
    if (c === VARDNAMN) ok.push(`CNAME ${c}`);
    else fel.push(`CNAME är "${c}", väntade "${VARDNAMN}"`);
  } catch {
    fel.push('dist/CNAME saknas — se PLAN.md 11');
  }

  // 4 · Ingen sitemap.
  for (const f of filer.concat(await readdir(DIST))) {
    if (path.basename(String(f)).startsWith('sitemap')) {
      fel.push(`sitemap hittad: ${f} — se PLAN.md avsnitt 12`);
    }
  }
}

await kor();

for (const rad of ok) console.log('  ok   ' + rad);
if (fel.length) {
  console.error('\nSPÄRRKONTROLLEN GICK INTE IGENOM:\n');
  for (const f of fel) console.error('  FEL  ' + f);
  console.error('\nIngenting publiceras. Se PLAN.md avsnitt 11 och 12.\n');
  process.exit(1);
}
console.log('\nSpärren håller. Utgåvan får publiceras.\n');

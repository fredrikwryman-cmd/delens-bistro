/**
 * Bildpipeline för rebrandrubriken.
 *
 *   node verktyg/rebrand.mjs
 *
 * RUBRIKEN ÄR TVÅ BILDER OCH ETT ORD. "Brutal Burgers blev Delen's
 * Bistro" var satt text; nu är de två namnen ritade — brutal-delens
 * (BRUTAL / BURGERS i rött) och delens-delens (Delen's i skrivstil
 * över BISTRO) — och ordet "blev" står kvar som text emellan. Se
 * .rebrand__rubrik i stilmallen. Originalen ligger orörda i
 * kalla/rebrand/.
 *
 * EN VIT KONTUR LÄGGS PÅ HÄR, och den är inte dekor. Sektionen är
 * djupröd, #6B1410, och bildernas röda står nästan i samma ton:
 *
 *   BRUTAL BURGERS   #C40C24   1,98:1 mot #6B1410
 *   Delen's          #DCBA91   6,62:1
 *   BISTRO           #B30405   1,69:1  — i praktiken osynligt
 *
 * Samma grepp som DELEN'S i hero och den satta lockupen före den:
 * formen bärs av en off-white kontur, och färgerna i bilden rörs
 * inte. Beslutat 2026-09-28.
 *
 * KONTUREN, DAMMRENSNINGEN OCH ALFASNÄPPET ligger i verktyg/ritade.mjs,
 * gemensamma med hero-lockupen; skälen står där. Konturen är en
 * utvidgning av alfan med R = 0,75 procent av bildens bredd — omkring
 * 3 px när bilden visas i sin största storlek, samma synliga tjocklek
 * som DELEN'S-konturen i hero hade.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { rensa, granser, kontur } from './ritade.mjs';

const KALLOR = 'kalla/rebrand';
const MAL = 'public/bilder/rebrand';

/** Konturens färg: sajtens off-white. */
const KONTUR = [0xf2, 0xeb, 0xe0];
/** Konturens radie som andel av den beskurna bildens bredd. */
const RADIE = 0.0075;
/** Minsta sammanhängande yta som räknas som bokstav, i källpixlar. */
const DAMM = 600;
const SNAPP = 240;
const BREDD = 900;
const KVALITET = 84;

const BILDER = [
  { kalla: 'brutal-delens.png', fil: 'brutal-burgers.webp' },
  { kalla: 'delens-delens.png', fil: 'delens-bistro.webp' }
];

async function kor() {
  await mkdir(MAL, { recursive: true });

  for (const b of BILDER) {
    const { data, info } = await sharp(path.join(KALLOR, b.kalla))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;

    // 1 · Bokstäverna, utan damm, med snäppt alfa.
    const bokstav = await rensa(data, W, H, { damm: DAMM, snapp: SNAPP });

    // 2 · Beskär till bokstäverna plus plats för konturen.
    const { x0, x1, y0, y1 } = granser(bokstav, W, H);
    const R = Math.round((x1 - x0) * RADIE);
    const kant = R + 4;
    const ut = {
      left: Math.max(0, x0 - kant),
      top: Math.max(0, y0 - kant),
      width: Math.min(W, x1 + kant + 1) - Math.max(0, x0 - kant),
      height: Math.min(H, y1 + kant + 1) - Math.max(0, y0 - kant)
    };

    // 3 · Konturen: utvidgad mask, mjuk ytterkant.
    const ihop = await kontur(data, W, H, bokstav, R, KONTUR);

    const fil = path.join(MAL, b.fil);
    const r = await sharp(ihop, { raw: { width: W, height: H, channels: 4 } })
      .extract(ut)
      .resize({ width: BREDD })
      .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
      .toFile(fil);
    const kb = (await stat(fil)).size / 1024;
    console.log(`${b.fil}  ${r.width}×${r.height}  ${kb.toFixed(1)} kB  R=${R}px i källan  utklipp ${JSON.stringify(ut)}`);
  }
}

kor();

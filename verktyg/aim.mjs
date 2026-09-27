/**
 * Bildpipeline för byggkreditens logotyp.
 *
 *   node verktyg/aim.mjs
 *
 * AiM Studios-logotypen ersätter den satta texten i knappens mitt när
 * knappen hovras — se .byggd__aktiv i stilmallen. Källan är aim-logo,
 * en PNG utan filändelse: blå vinkel och ljuslila ordbild på
 * genomskinlig botten.
 *
 * BESKÄRNINGEN ÄR UPPMÄTT mot alfakanalen. Källan är 2172×724 och
 * motivet ligger på x 256–1945, y 221–490; med två pixlars marginal
 * för kanten blir utklippet 1694×274, alltså 6,18:1.
 *
 * BREDDEN ÄR 420. Logotypen visas i 5,3em av knappens grad, som mest
 * 26 px, alltså 138 px. 420 är trefaldig täthet — knappen finns bara
 * för en pekare, så det är skärmar och inte telefoner som ska täckas,
 * och filen väger ändå bara 14 kB.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'C:/Users/fredr/OneDrive/Desktop/Delens Bistro/aim-logo';
const MAL = 'public/bilder/footer';
const FIL = 'aim-studios.webp';

/** Motivets ruta i källan, uppmätt mot alfakanalen. */
const UTKLIPP = { left: 254, top: 219, width: 1694, height: 274 };

const BREDD = 420;
const KVALITET = 90;

async function kor() {
  await mkdir(MAL, { recursive: true });

  const ut = path.join(MAL, FIL);
  const info = await sharp(KALLA)
    .extract(UTKLIPP)
    .resize({ width: BREDD })
    .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
    .toFile(ut);

  const kb = (await stat(ut)).size / 1024;
  console.log(`${FIL}  ${info.width}×${info.height}  ${kb.toFixed(1)} kB`);
}

kor();

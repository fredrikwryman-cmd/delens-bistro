/**
 * Bildpipeline för Made To Enjoy-märket i heron.
 *
 *   node verktyg/enjoy.mjs
 *
 * Källan är en PNG med alfa, 1536 × 1024, med motivet i mitten och
 * luft runt om. Luften beskärs bort. Annars räknas den in i bildens
 * bredd, och märket blir mindre än ytan det ska fylla.
 *
 * TVÅ BREDDER. Märket visas som bredast runt 350 CSS-px på desktop och
 * 256 på telefon. 480 täcker telefonen vid dubbel pixeltäthet och 800
 * täcker desktop. Alfan är ren: uppmätt ligger 99 procent av pixlarna
 * på 0 eller över 229. Ingen snäppning behövs, som burgaren i hero.mjs
 * behövde.
 *
 * KONTRASTEN MOT HERONS SVARTA (#0E0E0E) ÄR UPPMÄTT PÅ KÄLLAN:
 *   ljus text  rgb(252, 210, 150)  13,6:1
 *   rött       rgb(232, 1, 22)      4,1:1  bestick, stjärnor, båge
 * Det röda är grafik, inte text, och kravet för grafik är 3:1. Ingen
 * kontur behövs, till skillnad från DELEN'S.
 */

import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const KALLA = 'kalla/hero/enjoy.png';
const MAL = 'public/bilder/hero';
const BREDDER = [480, 800];

const beskuren = await sharp(KALLA).trim({ threshold: 6 }).png().toBuffer({ resolveWithObject: true });
console.log(`beskuren ${beskuren.info.width}×${beskuren.info.height}`);

for (const b of BREDDER) {
  const fil = `${MAL}/enjoy-${b}.webp`;
  const info = await sharp(beskuren.data)
    .resize({ width: b })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(fil);
  console.log(`${fil}  ${info.width}×${info.height}  ${((await stat(fil)).size / 1024).toFixed(0)} kB`);
}

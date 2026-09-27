/**
 * Bildpipeline för hero-lockupen.
 *
 *   node verktyg/lockup.mjs
 *
 * LOCKUPEN ÄR BILDER, inte satt text. DELENS och BISTRO stod i Titan
 * One med en ram ur -webkit-text-stroke. Nu är de två ritade ord med
 * egen vit kontur: delens-hero (DELEN'S i rött) bakom burgaren och
 * bistro-hero (BISTRO i amber) framför den. Originalen ligger orörda
 * i kalla/hero/.
 *
 * DELEN'S FÄRGAS OM TILL #6B1410 på vägen in — se verktyg/farg.mjs.
 * Källan går i en rosaröd #D44E61 som inte finns någon annanstans på
 * sajten; #6B1410 är --rod, samma djupröda som den satta lockupen
 * hade. Mot svart är den bara 1,59:1, och det är avsiktligt: formen
 * bärs av den vita konturen, som skiftet lämnar orörd, precis som den
 * satta typens vita ram bar den. BISTRO är amber och rörs inte.
 *
 * BESKÄRNINGEN ÄR UPPMÄTT mot alfakanalen, med två pixlars marginal
 * för den mjuka kanten. Rader och kolumner med färre än sex
 * ogenomskinliga pixlar räknas inte — källorna har lösa dammkorn
 * utanför bokstäverna, och de hade annars flyttat kanten.
 *
 *   delens-hero  2068×760  bläck x 78–1982  y 147–618  → 1909×476
 *   bistro-hero  1920×819  bläck x 77–1839  y 164–655  → 1767×496
 *
 * Stilmallen räknar med de proportionerna (4,01 och 3,56) — byts en
 * källa måste .hero__ord-måtten räknas om.
 *
 * ALFAN SNÄPPS, samma skäl som i verktyg/hero.mjs. Bokstävernas
 * insida ligger på alfa 253–254, inte 255. BISTRO ligger FRAMFÖR
 * burgaren, och en procents genomlysning är burgaren som skymtar
 * genom bokstäverna. Allt över SNAPP blir helt ogenomskinligt; den
 * mjuka kanten ligger under tröskeln och lämnas i fred.
 *
 * TVÅ BREDDER PER ORD. DELENS visas som mest 3,4 × 24rem = 1306 px
 * och BISTRO 1,56 × 24rem = 599 px (se .hero__ord i stilmallen).
 * Den stora filen är källans egen bredd — dubbel täthet på den
 * bredaste skärmen hade krävt mer än källan har. Den lilla täcker en
 * telefon: DELENS är 309 px vid 390 px vy, gånger tre är 927.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { hex, skiftaRott } from './farg.mjs';

const KALLOR = 'kalla/hero';
const MAL = 'public/bilder/hero';
const KVALITET = 84;
const SNAPP = 240;

const ORD = [
  {
    kalla: 'delens-hero.png',
    fil: 'delens',
    utklipp: { left: 76, top: 145, width: 1909, height: 476 },
    bredder: [960, 1909],
    /* Fyllningens medelvärde, uppmätt på full alfa. Grönkanalen
       ligger på 76–80 i 90 procent av pixlarna — ytan är jämn. */
    farg: { fran: [212, 78, 97], till: hex('#6b1410') }
  },
  {
    kalla: 'bistro-hero.png',
    fil: 'bistro',
    utklipp: { left: 75, top: 162, width: 1767, height: 496 },
    bredder: [640, 1200]
  }
];

async function kor() {
  await mkdir(MAL, { recursive: true });

  for (const o of ORD) {
    const { data, info } = await sharp(path.join(KALLOR, o.kalla))
      .extract(o.utklipp)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] >= SNAPP) data[i] = 255;
    }

    if (o.farg) skiftaRott(data, o.farg.fran, o.farg.till);

    for (const b of o.bredder) {
      const fil = `${o.fil}-${b}.webp`;
      const ut = path.join(MAL, fil);
      const r = await sharp(data, { raw: info })
        .resize({ width: b, withoutEnlargement: true })
        .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
        .toFile(ut);
      const kb = (await stat(ut)).size / 1024;
      console.log(`${fil}  ${r.width}×${r.height}  ${kb.toFixed(1)} kB`);
    }
  }
}

kor();

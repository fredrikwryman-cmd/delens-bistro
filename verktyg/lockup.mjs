/**
 * Bildpipeline för hero-lockupen.
 *
 *   node verktyg/lockup.mjs
 *
 * LOCKUPEN ÄR BILDER, inte satt text. DELENS och BISTRO stod i Titan
 * One med en ram ur -webkit-text-stroke. Nu är de två ritade ord med
 * egen vit kontur: delens-hero (DELEN'S i rött) bakom burgaren och
 * bistro-hero (BISTRO i amber) framför den. Båda källorna är PNG utan
 * filändelse.
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

const KALLOR = 'C:/Users/fredr/OneDrive/Desktop/Delens Bistro';
const MAL = 'public/bilder/hero';
const KVALITET = 84;
const SNAPP = 240;

const ORD = [
  {
    kalla: 'delens-hero',
    fil: 'delens',
    utklipp: { left: 76, top: 145, width: 1909, height: 476 },
    bredder: [960, 1909]
  },
  {
    kalla: 'bistro-hero',
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

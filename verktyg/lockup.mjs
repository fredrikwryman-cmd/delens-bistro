/**
 * Bildpipeline för hero-lockupen.
 *
 *   node verktyg/lockup.mjs
 *
 * LOCKUPEN ÄR BILDER, inte satt text. DELEN'S ligger bakom burgaren och
 * BISTRO framför den. Originalen ligger orörda i kalla/hero/.
 *
 * NYA KÄLLOR 2026-09-28: delens-hero-ny och bistro-hero-ny. DELEN'S är
 * nu beige skrivstil (#DBB485) i stället för röd blockstil, och BISTRO
 * rött (#BD1415) i stället för amber. Ingen av dem har egen kontur.
 * Omfärgningen som den förra DELEN'S fick (rosarött → #6B1410, via
 * verktyg/farg.mjs) gäller inte längre — den hade flyttat en beige
 * mot djuprött.
 *
 * RENSAS FÖRST — se verktyg/ritade.mjs. Källorna har lösa dammkorn och
 * en ljus rest av en tidigare kontur i kanterna, och på heros svarta
 * syns båda som brus. Rensningen snäpper också alfan: BISTRO ligger
 * FRAMFÖR burgaren, och bokstävernas alfa 240–254 hade släppt igenom
 * den.
 *
 * BESKÄRS MOT DE RENSADE BOKSTÄVERNA, med två pixlars marginal —
 * eller konturens radie plus fyra när ordet har kontur. Stilmallen
 * räknar med proportionerna som skrivs ut nedan; byts en källa måste
 * .hero__ord-måtten räknas om.
 *
 * TVÅ BREDDER PER ORD. Den stora täcker den bredaste skärmen i dubbel
 * täthet så långt källan räcker; den lilla en telefon i trefaldig.
 * Måtten står vid .hero__ord i stilmallen.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { rensa, granser, kontur } from './ritade.mjs';

const KALLOR = 'kalla/hero';
const MAL = 'public/bilder/hero';
const KVALITET = 84;

/** Konturens färg: sajtens off-white. */
const OFFWHITE = [0xf2, 0xeb, 0xe0];

const ORD = [
  {
    kalla: 'delens-hero-ny.png',
    fil: 'delens',
    /** Största bredden: källans egen efter beskärningen. */
    bredder: [960, 'full']
  },
  {
    kalla: 'bistro-hero-ny.png',
    fil: 'bistro',
    bredder: [640, 1400],
    /* Konturens radie som andel av bredden, eller 0 för ingen.
       BORTTAGEN 2026-09-28, på beställning, trots skälet nedan. Var
       0,0075. Läggs den tillbaka måste .hero__bistro .hero__ord i
       stilmallen räknas om till 3,81 × 0,851 em och 1,1 / 4,479.

       VIT KONTUR PÅ BISTRO, INTE PÅ DELEN'S — beslutat 2026-09-28.
       BISTRO:s röda står på 3,00:1 mot svart men 2,3–2,7:1 mot
       burgarens kött, som det ligger framför, och S-T-R flöt ihop med
       det. DELEN'S beige står på 9,96:1 och ligger bakom burgaren.
       0,0075 är samma andel som rebrandnamnen: omkring 3 px i största
       visningsstorlek. */
    kontur: 0
  }
];

async function kor() {
  await mkdir(MAL, { recursive: true });

  for (const o of ORD) {
    let { data, info } = await sharp(path.join(KALLOR, o.kalla))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;

    const bokstav = await rensa(data, W, H);
    const { x0, x1, y0, y1 } = granser(bokstav, W, H);

    const R = o.kontur ? Math.round((x1 - x0) * o.kontur) : 0;
    if (R) data = await kontur(data, W, H, bokstav, R, OFFWHITE);

    const kant = R ? R + 4 : 2;
    const ut = {
      left: Math.max(0, x0 - kant),
      top: Math.max(0, y0 - kant),
      width: Math.min(W, x1 + kant + 1) - Math.max(0, x0 - kant),
      height: Math.min(H, y1 + kant + 1) - Math.max(0, y0 - kant)
    };
    console.log(`${o.kalla}: utklipp ${ut.width}×${ut.height}, ${(ut.width / ut.height).toFixed(3)}:1${R ? `, kontur R=${R}` : ''}`);

    for (const b of o.bredder) {
      const bredd = b === 'full' ? ut.width : b;
      const fil = `${o.fil}-${bredd}.webp`;
      const mal = path.join(MAL, fil);
      const r = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
        .extract(ut)
        .resize({ width: bredd, withoutEnlargement: true })
        .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
        .toFile(mal);
      const kb = (await stat(mal)).size / 1024;
      console.log(`  ${fil}  ${r.width}×${r.height}  ${kb.toFixed(1)} kB`);
    }
  }
}

kor();

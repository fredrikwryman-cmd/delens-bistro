/**
 * Bildpipeline för lokalbilderna — E-gruppen.
 *
 *   node verktyg/lokal.mjs
 *
 * Fem källor, fem utsnitt.
 *
 * E1 INTERIÖREN beskärs till rutans 4:3. E2 SMASHMOMENTET och E4
 * FASADEN går rakt igenom — 3:2 respektive 16:9, samma form som
 * platserna de ska fylla.
 *
 * E3 ÄR NU ETT RIKTIGT PORTRÄTT, inte en beskärning. Tidigare klipptes
 * det ur gruppfotot: 1672×941 liggande, tre personer bredvid varandra,
 * och i en stående 3:4-ruta fick bara mittenpersonen plats. Det var en
 * nödlösning — ett utsnitt ur ett vidvinkelfoto blir mjukt, och Hakan
 * stod dessutom inte still för kameran i den bilden.
 *
 * Den nya källan är fotad som porträtt i baren, 1122×1402. Den enda
 * beskärningen som behövs är i sidled: 1122×1402 är 0,800 och rutan
 * är 0,750, alltså 71 px för brett. Snittet läggs 8 px in från vänster
 * och tar resten från höger — där ligger bara en växt och en flaska i
 * bakgrunden, medan vänsterkanten bär bardisken som ramar in honom.
 *
 * E5 står kvar ur gruppfotot: vidvinkel, alla tre framför
 * väggmålningen. De två korten visar nu olika tillfällen, inte samma
 * fotografi två gånger inom sexhundra pixlar.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/lokal';
const MAL = 'public/bilder/lokal';
const KVALITET = 80;

/**
 * left/width utelämnat betyder hela bredden. Höjden är alltid hela
 * källans — båda fotona är redan beskurna i höjdled.
 */
const UTSNITT = [
  {
    id: 'E1',
    kalla: 'interior.png',
    /* Rutan är 4:3, källan 16:9. Full höjd behålls och 418 px tas i
       sidled — allihop från vänster, där kylskåpet och en bit tom
       vägg står. Ölpelaren hamnar då strax till höger om mitten och
       glashyllan löper in i bilden uppifrån vänster, alltså diagonalt
       genom rutan i stället för tvärs över den. */
    extract: { left: 300, top: 0, width: 1254, height: 941 },
    bredd: 1400,
    beskrivning: 'interiören, baren i 4:3'
  },
  {
    id: 'E2',
    kalla: 'smash.png',
    /* Ingen beskärning. Källan är 1536×1024, alltså exakt 3:2, och
       rutan är 3:2. Att beskära en bild som redan har rätt form är
       bara att kasta pixlar. */
    bredd: 1200,
    beskrivning: 'smashmomentet, 3:2 rakt av'
  },
  {
    id: 'E4',
    kalla: 'fasad.png',
    bredd: 1600,
    beskrivning: 'fasaden, 16:9 rakt av'
  },
  {
    id: 'E3',
    kalla: 'hakan-portratt.png',
    // 3:4 av 1402 px höjd blir 1051 bred, 71 px smalare än källan.
    extract: { left: 8, top: 0, width: 1051, height: 1402 },
    bredd: 900,
    beskrivning: 'porträtt i baren, Hakan'
  },
  {
    id: 'E5',
    kalla: 'local-heros.png',
    bredd: 1600,
    beskrivning: 'vidvinkel, alla tre och väggmålningen'
  }
];

async function kor() {
  await mkdir(MAL, { recursive: true });
  let fore = 0;
  let efter = 0;

  for (const u of UTSNITT) {
    const kalla = path.join(KALLA, u.kalla);
    const mal = path.join(MAL, u.id + '.webp');

    let bild = sharp(kalla);
    if (u.extract) bild = bild.extract(u.extract);

    const ut = await bild
      .resize({ width: u.bredd, kernel: 'lanczos3' })
      .webp({ quality: KVALITET, effort: 6 })
      .toFile(mal);

    const k = (await stat(kalla)).size;
    const m = (await stat(mal)).size;
    fore += k;
    efter += m;

    console.log(
      `${u.id}  ${ut.width}×${ut.height}  ` +
        `${(m / 1024).toFixed(0)} kB   ${u.beskrivning}`
    );
  }

  console.log(
    `\n${UTSNITT.length} utsnitt   ${(fore / 1048576).toFixed(1)} MB källa → ` +
      `${(efter / 1024).toFixed(0)} kB`
  );
}

kor();

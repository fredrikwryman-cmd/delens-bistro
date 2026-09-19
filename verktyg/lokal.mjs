/**
 * Bildpipeline för lokalbilderna — E-gruppen.
 *
 *   node verktyg/lokal.mjs
 *
 * Två källor, tre utsnitt.
 *
 * E4 FASADEN går rakt igenom. 16:9, som platsen den ska fylla.
 *
 * E3 OCH E5 KOMMER UR SAMMA FOTO men visar inte samma sak, och det är
 * med flit. Gruppbilden är 1672×941 — tre personer bredvid varandra i
 * ett liggande format. E3-kortet är 3:4 stående, och i den rutan får
 * tre personer sida vid sida helt enkelt inte plats: provbeskärningar
 * vid tre olika lägen klippte alltid bort minst en av dem.
 *
 * Att lägga samma vida bild i båda rutorna vore dessutom samma
 * fotografi två gånger inom sexhundra pixlar i samma sektion.
 *
 * Därför bär de olika motiv ur samma bild:
 *   E3  stående, tätt på Hakan — mannen rebrandtexten handlar om
 *   E5  vidvinkel, alla tre framför väggmålningen
 *
 * Båda platshållarna fylls, ingenting upprepas.
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
    id: 'E4',
    kalla: 'fasad.png',
    bredd: 1600,
    beskrivning: 'fasaden, 16:9 rakt av'
  },
  {
    id: 'E3',
    kalla: 'local-heros.png',
    // 3:4 av 941 px höjd blir 706 bred. Mitten av bilden är Hakan.
    extract: { left: 483, top: 0, width: 706, height: 941 },
    bredd: 900,
    beskrivning: 'stående, Hakan'
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

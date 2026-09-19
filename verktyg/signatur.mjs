/**
 * Bildpipeline för signaturburgarna.
 *
 *   node verktyg/signatur.mjs
 *
 * Bilderna är porträtt, 1792×2400, fotade mot en mörk fond med
 * logotypen i bakgrunden. Fonden är en del av bilden och ska vara
 * kvar — ingen frilägning här, till skillnad från hero.
 *
 * Ingen beskärning görs i pipelinen. Dragspelets kort beskär själva
 * med object-fit, och kortets form ändras mellan aktivt, inaktivt och
 * lodrätt fingerläge. Att baka in en beskärning skulle låsa en av de
 * tre formerna och förstöra de andra två.
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/signatur';
const MAL = 'public/bilder/signatur';

/** Mediarutan är som mest ~726 px bred på desktop. 1000 ger drygt 1,4×. */
const MAL_BREDD = 1000;
const KVALITET = 74;

async function kor() {
  await mkdir(MAL, { recursive: true });
  const filer = (await readdir(KALLA)).filter((f) => /^C\d\.jpe?g$/i.test(f)).sort();
  const rader = [];

  for (const fil of filer) {
    const id = path.basename(fil, path.extname(fil));
    const kalla = path.join(KALLA, fil);
    const mal = path.join(MAL, id + '.webp');

    const fore = (await stat(kalla)).size;
    const meta = await sharp(kalla).metadata();

    await sharp(kalla)
      .resize({ width: MAL_BREDD, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: KVALITET, effort: 6 })
      .toFile(mal);

    const efter = (await stat(mal)).size;
    const ny = await sharp(mal).metadata();

    rader.push({
      id,
      fore: `${meta.width}×${meta.height}`,
      efter: `${ny.width}×${ny.height}`,
      foreKB: Math.round(fore / 1024),
      efterKB: Math.round(efter / 1024),
      minskning: Math.round((1 - efter / fore) * 100) + ' %'
    });
  }

  console.table(rader);
  console.log(
    `Totalt: ${rader.reduce((s, r) => s + r.foreKB, 0)} kB → ` +
    `${rader.reduce((s, r) => s + r.efterKB, 0)} kB`
  );
}

kor();

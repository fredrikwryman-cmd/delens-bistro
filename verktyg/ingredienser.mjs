/**
 * Bildpipeline för ingredienserna.
 *
 *   node verktyg/ingredienser.mjs
 *
 * Fyra motiv i två varianter, frilagda och tagna något uppifrån. De
 * används på två ställen och av två skäl, och valet av variant följer
 * av vilken rörelse bilden ska tåla.
 *
 * FOOTERJONGLERINGEN roterar 220 till 600 grader per kast. Då måste
 * rotationen SYNAS, och det gör den bara på en siluett som inte är
 * radiellt symmetrisk. Därför köttpucken sedd snett uppifrån — dess
 * synliga kant vrider sig — ostskivan med sina fyra hörn, och
 * salladsbladet. Tomatskivan är utesluten ur numret med flit: en
 * perfekt cirkel som snurrar ser stillastående ut.
 *
 * MUSPEKARKEDJANS KNUTAR roterar inte, de släpar. Där spelar
 * symmetrin ingen roll och läsbarheten allt, så alla fyra motiven
 * visas — i sin andra variant, så att samma bild aldrig står på två
 * ställen samtidigt.
 *
 * Måttet styrs av jongleringen, som ritar störst: 92 px som mest,
 * alltså 184 vid två gångers pixeltäthet. 200 ger marginal.
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/ingredienser';
const MAL = 'public/bilder/ingredienser';

const MAL_BREDD = 200;
const KVALITET = 78;

/** Låg tröskel: motiven har mjuka alfakanter som inte ska ätas upp. */
const TRIM_TROSKEL = 6;

/** Filnamn får bara vara ASCII — ett ö i en URL måste procentkodas. */
const asciiNamn = (n) =>
  n.replace(/ö/g, 'o').replace(/ä/g, 'a').replace(/å/g, 'a');

async function kor() {
  await mkdir(MAL, { recursive: true });
  const filer = (await readdir(KALLA)).filter((f) => f.endsWith('.png')).sort();
  const rader = [];
  let fore = 0;
  let efter = 0;

  for (const fil of filer) {
    const id = asciiNamn(path.basename(fil, '.png'));
    const kalla = path.join(KALLA, fil);
    const mal = path.join(MAL, id + '.webp');

    const kallstorlek = (await stat(kalla)).size;
    const meta = await sharp(kalla).metadata();

    const info = await sharp(kalla)
      .trim({ threshold: TRIM_TROSKEL })
      .resize({ width: MAL_BREDD })
      // alphaQuality 100: förstörande komprimerad alfa lägger brus som
      // delvis genomskinliga pixlar mitt i motivet. Samma fälla som i
      // hero.mjs, samma svar.
      .webp({ quality: KVALITET, alphaQuality: 100, effort: 6 })
      .toFile(mal);

    const malstorlek = (await stat(mal)).size;
    fore += kallstorlek;
    efter += malstorlek;

    rader.push([
      id,
      `${meta.width}×${meta.height}`,
      `${info.width}×${info.height}`,
      `${(kallstorlek / 1024).toFixed(0)} kB`,
      `${(malstorlek / 1024).toFixed(0)} kB`
    ]);
  }

  const bredd = [0, 1, 2, 3, 4].map((i) =>
    Math.max(...rader.map((r) => r[i].length))
  );
  for (const r of rader) {
    console.log(r.map((v, i) => v.padEnd(bredd[i])).join('  '));
  }
  console.log(
    `\n${rader.length} ingredienser   ${(fore / 1048576).toFixed(1)} MB → ` +
      `${(efter / 1024).toFixed(0)} kB`
  );
}

kor();

/**
 * Bildpipeline för lagersektionen.
 *
 *   node verktyg/bilder.mjs
 *
 * Läser PNG-originalen i kalla/lager/, dämpar kantfransen där den
 * lyser, skalar till den storlek sidan faktiskt använder och skriver
 * WebP med alfa till public/bilder/lager/.
 *
 * Scenen är som mest 560 px bred. Bredaste lagret ritas i 83 procent
 * av den, alltså ~465 px. MAL_BREDD täcker det med marginal vid 2×.
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/lager';
const MAL = 'public/bilder/lager';
const MAL_BREDD = 900;
const KVALITET = 82;

/**
 * Lager som behöver avfransning. Värdet är ljustöskeln: pixlar i
 * kantzonen (delvis alfa) ljusare än så dras ned mot tröskeln.
 *
 * A4 sallad mätte medelljus 132 i kantzonen med 187 pixlar över 200 —
 * en blek kontur som lyser mot #0E0E0E. Övriga fyra är rena.
 */
const AVFRANSA = { A4: 140 };

/**
 * Beskärning nedtill, angivet som sista rad att behålla i originalet.
 *
 * A1 överbulle innehöll brödets snittyta — den jämnt ljusa undersidan
 * under den mörka skorpkanten. I en staplad burgare är den ytan dold
 * av osten, men vid separation låg den överst och läste som fel sida
 * av bullen.
 *
 * Radanalys av originalet: ljusstyrkan faller från 145 vid y=580 till
 * ett minimum på 53 vid y=652 — det är skorpkanten där rundningen
 * slutar. Därefter stiger den igen till en jämn platå kring 107 utan
 * några specularer, vilket är snittytan. Vi behåller till och med
 * skorpkanten och klipper allt under den.
 */
const BESKAR = { A1: 656 };

async function avfransa(rawBuffer, info, troskel) {
  const { width, height, channels } = info;
  const p = rawBuffer;
  let antal = 0;

  for (let i = 0; i < p.length; i += channels) {
    const a = p[i + 3];
    if (a < 12 || a > 240) continue;
    const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    if (lum <= troskel) continue;

    const f = Math.max(0.5, troskel / lum);
    p[i] = Math.round(p[i] * f);
    p[i + 1] = Math.round(p[i + 1] * f);
    p[i + 2] = Math.round(p[i + 2] * f);
    if (lum > 190) p[i + 3] = Math.round(a * 0.75);
    antal++;
  }

  return { data: p, width, height, channels, antal };
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const filer = (await readdir(KALLA)).filter((f) => f.endsWith('.png')).sort();
  const rader = [];

  for (const fil of filer) {
    const id = path.basename(fil, '.png');
    const kalla = path.join(KALLA, fil);
    const mal = path.join(MAL, id + '.webp');

    const fore = (await stat(kalla)).size;
    let bild = sharp(kalla).ensureAlpha();
    const meta = await bild.metadata();

    let beskuren = '';
    if (BESKAR[id] && BESKAR[id] < meta.height) {
      bild = bild.extract({ left: 0, top: 0, width: meta.width, height: BESKAR[id] });
      beskuren = `−${meta.height - BESKAR[id]} px`;
      // Efter extract måste bufferten materialiseras innan raw-passet.
      bild = sharp(await bild.png().toBuffer());
    }

    let dampade = 0;
    if (AVFRANSA[id]) {
      const { data, info } = await bild.raw().toBuffer({ resolveWithObject: true });
      const r = await avfransa(data, info, AVFRANSA[id]);
      dampade = r.antal;
      bild = sharp(r.data, {
        raw: { width: r.width, height: r.height, channels: r.channels }
      });
    }

    await bild
      .resize({ width: MAL_BREDD, withoutEnlargement: true, kernel: 'lanczos3' })
      .webp({ quality: KVALITET, alphaQuality: 90, effort: 6 })
      .toFile(mal);

    const efter = (await stat(mal)).size;
    const ny = await sharp(mal).metadata();

    rader.push({
      id,
      fore: `${meta.width}×${meta.height}`,
      efter: `${ny.width}×${ny.height}`,
      foreKB: Math.round(fore / 1024),
      efterKB: Math.round(efter / 1024),
      minskning: Math.round((1 - efter / fore) * 100) + ' %',
      beskuren: beskuren || '—',
      alfa: ny.hasAlpha ? 'ja' : 'NEJ',
      dampade
    });
  }

  console.table(rader);
  const summaFore = rader.reduce((s, r) => s + r.foreKB, 0);
  const summaEfter = rader.reduce((s, r) => s + r.efterKB, 0);
  console.log(`Totalt: ${summaFore} kB → ${summaEfter} kB`);
}

kor();

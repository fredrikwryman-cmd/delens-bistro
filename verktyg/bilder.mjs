/**
 * Bildpipeline för laddskärmens burgare.
 *
 *   node verktyg/bilder.mjs
 *
 * Läser PNG-originalen i kalla/lager/, dämpar kantfransen där den
 * lyser, skalar till de storlekar sidan faktiskt använder och skriver
 * WebP med alfa.
 *
 * EN UTGÅVA NU, TVÅ FÖRUT. Den andra var lagersektionen — samma fem
 * lager i 900 px, för en scen som var 560 px bred. Den sektionen är
 * riven och ersatt av scroll-sekvensen (verktyg/sekvens.mjs), så
 * 900-utgåvan är borttagen och public/bilder/lager/ med den: 388 kB
 * som ingenting längre pekade på. Strukturen med UTGAVOR står kvar,
 * för den bär förbehandlingen — beskärningen av A1 och avfransningen
 * av A4 ska gälla varje utgåva som tillkommer.
 *
 *   ladd   laddskärmens stapel är som mest 160 px. Varje lager får sin
 *          EGEN bredd, uträknad ur registret i stilmallen gånger två
 *          för pixeltäthet — en gemensam bredd hade gett det smalaste
 *          lagret 14 procent mer upplösning än det behöver och det
 *          bredaste för lite.
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/lager';

/* Lagrens andel av scenens bredd. SAMMA TAL SOM --b i stilmallen
   (.lager__bit img). Står de isär ritas laddskärmens lager i fel
   upplösning — inte fel storlek, för CSS styr det, utan mjukt. */
const ANDEL = { A1: 0.724, A2: 0.773, A3: 0.829, A4: 0.783, A5: 0.744 };

const UTGAVOR = [
  {
    mal: 'public/bilder/ladd',
    // 160 px stapel × lagrets andel × 2 för pixeltäthet.
    bredd: (id) => Math.round(160 * ANDEL[id] * 2),
    kvalitet: 76,
    alfa: 85
  }
];

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
  for (const u of UTGAVOR) await mkdir(u.mal, { recursive: true });
  const filer = (await readdir(KALLA)).filter((f) => f.endsWith('.png')).sort();
  const rader = [];

  for (const fil of filer) {
    const id = path.basename(fil, '.png');
    const kalla = path.join(KALLA, fil);

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

    /* Bufferten materialiseras EN gång och skalas sedan om per
       utgåva. Att skala om en redan nedskalad bild till en ännu
       mindre hade lagt två resamplingar på varandra. */
    const forbehandlad = await bild.png().toBuffer();

    for (const u of UTGAVOR) {
      const mal = path.join(u.mal, id + '.webp');
      await sharp(forbehandlad)
        .resize({ width: u.bredd(id), withoutEnlargement: true, kernel: 'lanczos3' })
        .webp({ quality: u.kvalitet, alphaQuality: u.alfa, effort: 6 })
        .toFile(mal);

      const efter = (await stat(mal)).size;
      const ny = await sharp(mal).metadata();

      rader.push({
        id,
        utgava: path.basename(u.mal),
        fore: `${meta.width}×${meta.height}`,
        efter: `${ny.width}×${ny.height}`,
        foreKB: Math.round(fore / 1024),
        efterKB: Math.round(efter / 1024),
        beskuren: beskuren || '—',
        alfa: ny.hasAlpha ? 'ja' : 'NEJ',
        dampade
      });
    }
  }

  console.table(rader);
  for (const u of UTGAVOR) {
    const mina = rader.filter((r) => r.utgava === path.basename(u.mal));
    const summa = mina.reduce((s, r) => s + r.efterKB, 0);
    console.log(
      `${path.basename(u.mal)}: ${summa} kB totalt, ` +
        `${(summa / mina.length).toFixed(1)} kB i snitt`
    );
  }
}

kor();

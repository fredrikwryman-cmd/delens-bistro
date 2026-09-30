/**
 * Mindre storlekar av de stora bilderna, för srcset.
 *
 *   node verktyg/storlekar.mjs
 *
 * Sist i npm run bilder. KÄLLAN ÄR DEN FÄRDIGA FULLSTORA FILEN som
 * respektive pipeline redan skriver (hero.mjs, signatur.mjs, lokal.mjs,
 * rebrand.mjs, lockup.mjs, valkommen.mjs, karta.mjs). Den är varje
 * bilds kanoniska utgåva — beskärning, frilägg och färg är redan gjorda
 * där — och de små storlekarna är ren nedskalning av den, minst 1,2
 * gånger, med lanczos3. Körs en av de pipelinerna om ska det här
 * steget köras efter.
 *
 * BREDDERNA ÄR VALDA UR SAJTENS EGNA MÅTT, inte ur en standardlista.
 * Varje bild är uppmätt i sin visningsbredd var tionde pixel från 320
 * till 1920, med och utan pekskärm (direktiv 6). Bredderna ska täcka
 * tre fall med minsta möjliga fil:
 *
 *   1440 px desktop, täthet 1   den vanligaste skärmen på desktop
 *   390 px telefon, täthet 2    äldre och billigare telefoner
 *   390 px telefon, täthet 3    iPhone; får oftast den fulla filen
 *
 * sizes i HTML:en (och i verktyg/statisk.mjs för signaturbilderna) är
 * skrivna ur samma mätning. Ändras en layout ska båda ses över, och
 * kontrollen är att mäta vilken fil webbläsaren väljer, inte att titta
 * på skärmen — ett fel sizes syns inte, det kostar bara bytes.
 *
 * Namnet är filens namn plus bredden: E1.webp → E1-600.webp. Den
 * fullstora filen behåller sitt namn och är största steget i srcset.
 */

import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const B = 'public/bilder';

/**
 * fil: den fullstora filen. bredder: de mindre som ska skrivas.
 * Kommentaren är den uppmätta visningsbredden som bredderna bygger på.
 */
const REGISTER = [
  // Hjältens burgare. B2 upp till 900 px: 70vw, sedan 340 px. B1: 520 px.
  { fil: 'hero/B2.webp', bredder: [360, 560] },
  { fil: 'hero/B1.webp', bredder: [560] },
  // Ordet DELENS, LCP på desktop: 1279 px vid 1440. 960 och 1982 finns.
  { fil: 'hero/delens-1982.webp', bredder: [1300], namn: 'hero/delens-1300.webp' },
  // Signaturburgarna: dragspelet ≤ 642 px med mus, luckan ≤ 736 px.
  ...['C1', 'C2', 'C3', 'C4', 'C5'].map((id) => ({ fil: `signatur/${id}.webp`, bredder: [400, 760] })),
  // Rebrandrubriken: 313 och 360 px vid 1440, 63–73vw på telefon.
  { fil: 'rebrand/delens-bistro.webp', bredder: [360, 640] },
  { fil: 'rebrand/brutal-burgers.webp', bredder: [360, 640] },
  // Lokalfotona.
  { fil: 'lokal/E1.webp', bredder: [600, 900] }, //  594 px vid 1440
  { fil: 'lokal/E2.webp', bredder: [400, 800] }, //  295 px vid 1440
  { fil: 'lokal/E3.webp', bredder: [300, 600] }, //  260 px vid 1440
  { fil: 'lokal/E4.webp', bredder: [800, 1200] }, // 792 px vid 1440
  { fil: 'lokal/E5.webp', bredder: [700, 1100] }, // 1011 px vid 1440 (Om oss)
  // Kartan och hälsningen i finalen.
  { fil: 'karta/hitta.webp', bredder: [760] }, // 1182 px vid 1440, 92vw på telefon
  { fil: 'final/valkommen.webp', bredder: [540] } // 480 px från 540
];

const KVALITET = 80;

let summa = 0;
for (const { fil, bredder, namn } of REGISTER) {
  const kalla = `${B}/${fil}`;
  const { width, hasAlpha } = await sharp(kalla).metadata();
  for (const bredd of bredder) {
    if (bredd * 1.2 > width) throw new Error(`${fil}: ${bredd} är för nära källans ${width}`);
    const mal = (namn ? `${B}/${namn}` : kalla).replace(/(-\d+)?\.webp$/, `-${bredd}.webp`);
    await sharp(kalla)
      .resize({ width: bredd, kernel: 'lanczos3' })
      .webp({ quality: KVALITET, alphaQuality: hasAlpha ? 100 : undefined, effort: 6 })
      .toFile(mal);
    const kb = (await stat(mal)).size / 1024;
    summa += kb;
    console.log(`${mal.padEnd(44)} ${String(bredd).padStart(5)} px  ${kb.toFixed(1).padStart(6)} kB`);
  }
}
console.log(`summa ${summa.toFixed(0)} kB`);

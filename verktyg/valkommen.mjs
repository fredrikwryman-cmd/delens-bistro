/**
 * Bildpipeline för finalens hälsning.
 *
 *   node verktyg/valkommen.mjs
 *
 * TVÅ RADER, INTE EN. Källan är ny-valkommen (en PNG utan filändelse):
 * "VÄLKOMMEN TILL" över "DELEN'S BISTRO", i en ljusare röd än märkets.
 * Den ersatte en rad bubbeltyp i 8,8:1 som klistrades in som en enhet.
 * Nu skrivs den fram rad för rad — se .final__halsning i stilmallen.
 *
 * BESKÄRNINGEN ÄR UPPMÄTT, inte trim(). Källan är 1920×819 och
 * motivet ligger på x 74–1844, y 165–637 (alfa över 8). Mätt per rad:
 *
 *   rad 1  x 223–1695  y 165–368
 *   rad 2  x  74–1844  y 404–637
 *
 * Utklippet nedan blir 1771×473. Stilmallens mask räknar med exakt
 * de här talen: rad ett slutar på 43 % av höjden och rad två börjar
 * på 50,5 %, så skarven mellan maskens två lager läggs på 50 %. Rad
 * ett går från 8,4 till 91,5 % av bredden, rad två kant till kant.
 * Byts källan måste de procenten mätas om.
 *
 * Det lösa pixeldammet ovanför rad ett (vid y 150) har alfa under 8
 * och hamnar utanför utklippet.
 *
 * BREDDEN ÄR 1080. Hälsningen visas som mest i 30rem = 480 px, alltså
 * räcker 960 för dubbel pixeltäthet. En telefon med trefaldig täthet
 * når 358 px × 3 = 1074, och 1080 täcker den.
 *
 * WEBP MED ALFA. Typen ligger direkt på sektionens svarta. Kvalitet
 * 82: de trasiga tryckkanterna är mjuka övergångar mot genomskinligt,
 * och där syns artefakter tidigare än i ett foto.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'C:/Users/fredr/OneDrive/Desktop/Delens Bistro/ny-valkommen';
const MAL = 'public/bilder/final';
const FIL = 'valkommen.webp';

/** Motivets ruta i källan, uppmätt mot alfakanalen. */
const UTKLIPP = { left: 74, top: 165, width: 1771, height: 473 };

/** Visas som mest i 30rem = 480 px. Täcker trefaldig täthet på telefon. */
const BREDD = 1080;
const KVALITET = 82;

async function kor() {
  await mkdir(MAL, { recursive: true });

  const ut = path.join(MAL, FIL);
  const info = await sharp(KALLA)
    .extract(UTKLIPP)
    .resize({ width: BREDD, withoutEnlargement: true })
    .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
    .toFile(ut);

  const b = (await stat(ut)).size;
  console.log(
    `${FIL}  ${info.width}×${info.height}  ${(b / 1024).toFixed(1)} kB`
  );
  console.log(`visas i högst 480 px, alltså ${(info.width / 480).toFixed(1)}x`);
}

kor();

/**
 * Bildpipeline för finalens hälsning.
 *
 *   node verktyg/valkommen.mjs
 *
 * TVÅ RADER, INTE EN. Källan är kalla/final/ny-valkommen.png:
 * "VÄLKOMMEN TILL" över "DELEN'S BISTRO".
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
 * FÄRGEN SKIFTAS PÅ VÄGEN IN — se verktyg/farg.mjs. Källan går i en
 * rosaröd #D53F50. Sajtens djupröda är #6B1410, men den står bara på
 * 1,59:1 mot svart, och den här typen har ingen vit kontur som bär
 * formen. Det är sidans sista mening; den ska gå att läsa.
 *
 * Därför samma nyans som #6B1410 — 2,6° och 74 procents mättnad i
 * HSL — med ljusheten lyft från 24 till 43 procent: #BF241D. Den står
 * på 3,20:1 mot sektionens #0E0E0E, över 3:1 för stor text. 42 procent
 * hade gett 3,07 — på gränsen, utan marginal för tryckets struktur.
 *
 * WEBP MED ALFA. Typen ligger direkt på sektionens svarta. Kvalitet
 * 82: de trasiga tryckkanterna är mjuka övergångar mot genomskinligt,
 * och där syns artefakter tidigare än i ett foto.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { hex, skiftaRott } from './farg.mjs';

const KALLA = 'kalla/final/ny-valkommen.png';

/** Fyllningens medelvärde, uppmätt på full alfa. */
const FRAN = [213, 63, 80];
const TILL = hex('#bf241d');
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
  const { data, info: ra } = await sharp(KALLA)
    .extract(UTKLIPP)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  skiftaRott(data, FRAN, TILL);

  const info = await sharp(data, { raw: ra })
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

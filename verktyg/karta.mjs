/**
 * Statisk kartbild för Hitta hit.
 *
 *   node verktyg/karta.mjs
 *
 * VARFÖR STATISK. En inbäddad Google-karta laddar Googles skript i
 * besökarens webbläsare, sätter kakor och kräver därmed ett samtycke
 * — en kakruta, på en sida vars enda ärende är en adress och ett
 * telefonnummer. En bild med en länk gör samma nytta: man ser var
 * stället ligger, och klickar man hamnar man i Google Maps med hela
 * dess funktion. Ingen kaka, ingen ruta, ingenting att samtycka till.
 * Integritetspolicyn beskriver sajten så.
 *
 * Brickorna kommer från OpenStreetMap. Upphovsrätten kräver synlig
 * attribution, och den står i bildtexten i index.html — inte inbränd
 * i bilden, för då går den inte att läsa av en skärmläsare.
 *
 * Brickorna tonas mot sajtens palett. En standardkarta i Googles eller
 * OSM:s egna färger är ljusgrå och blå och skär sig mot det djupröda
 * blocket den ligger i; avmättad och mörkad lägger den sig i stället i
 * samma ton som resten.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';

const MAL = 'public/bilder/karta';

/** Centralvägen 3, 194 76 Upplands Väsby. Geokodad via Nominatim. */
const LAT = 59.5213185;
const LON = 17.9032019;

const ZOOM = 16;
const BRICKA = 256;

/** Utsnittet. 16:9 i två gångers pixeltäthet för en spalt på ~600 px. */
const BREDD = 1200;
const HOJD = 675;

const AGENT = 'delens-bistro-bygge/1.0 (visningsprojekt, ingen publicering)';

/** Världspixel vid given zoom — brickor är 256 px. */
function världspixel(lat, lon, z) {
  const n = 2 ** z * BRICKA;
  const x = ((lon + 180) / 360) * n;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  return { x, y };
}

async function hämtaBricka(z, x, y) {
  const svar = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    headers: { 'User-Agent': AGENT }
  });
  if (!svar.ok) throw new Error(`bricka ${z}/${x}/${y}: ${svar.status}`);
  return Buffer.from(await svar.arrayBuffer());
}

async function kor() {
  await mkdir(MAL, { recursive: true });

  const mitt = världspixel(LAT, LON, ZOOM);
  const vänster = mitt.x - BREDD / 2;
  const topp = mitt.y - HOJD / 2;

  const x0 = Math.floor(vänster / BRICKA);
  const y0 = Math.floor(topp / BRICKA);
  const x1 = Math.floor((vänster + BREDD) / BRICKA);
  const y1 = Math.floor((topp + HOJD) / BRICKA);

  const lager = [];
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      lager.push({
        input: await hämtaBricka(ZOOM, tx, ty),
        left: Math.round(tx * BRICKA - vänster),
        top: Math.round(ty * BRICKA - topp)
      });
    }
  }

  const duk = (x1 - x0 + 1) * BRICKA;
  const dukH = (y1 - y0 + 1) * BRICKA;

  const rå = await sharp({
    create: {
      width: duk,
      height: dukH,
      channels: 3,
      background: { r: 20, g: 20, b: 20 }
    }
  })
    .composite(lager)
    .png()
    .toBuffer();

  /* Tonas mot paletten: avmättad, mörkad, en aning varmare. Kartan ska
     läsa som underlag, inte som ett fönster ut ur sajten. */
  const tonad = await sharp(rå)
    .extract({ left: 0, top: 0, width: BREDD, height: HOJD })
    .modulate({ saturation: 0.22, brightness: 0.55 })
    .tint({ r: 255, g: 238, b: 220 })
    .linear(1.15, -18)
    .toBuffer();

  /* Nålen sitter i bildens mitt, för utsnittet är centrerat på
     adressen. Ritad som SVG så den blir skarp i alla storlekar. */
  const nål = Buffer.from(
    `<svg width="${BREDD}" height="${HOJD}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${BREDD / 2}" cy="${HOJD / 2}" r="46"
               fill="rgb(232 163 61 / 0.18)" />
       <circle cx="${BREDD / 2}" cy="${HOJD / 2}" r="22"
               fill="#e8a33d" stroke="#0e0e0e" stroke-width="6" />
     </svg>`
  );

  const mal = `${MAL}/hitta.webp`;
  await sharp(tonad)
    .composite([{ input: nål }])
    .webp({ quality: 80, effort: 6 })
    .toFile(mal);

  const storlek = (await stat(mal)).size;
  console.log(
    `hitta.webp  ${BREDD}×${HOJD}  ${(storlek / 1024).toFixed(0)} kB  ` +
      `${lager.length} brickor, zoom ${ZOOM}`
  );
  console.log(`mitt: ${LAT}, ${LON}`);
  console.log('attribution © OpenStreetMap ska stå i bildtexten');
}

kor();

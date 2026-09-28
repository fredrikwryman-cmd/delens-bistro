/**
 * Bildpipeline för hero-burgaren.
 *
 *   node verktyg/hero.mjs
 *
 * KÄLLAN BYTTE KARAKTÄR. Förut låg här två JPEG-er — B1 liggande och
 * B2 porträtt — fotade mot en nästan svart botten och INTE frilagda.
 * Den pipelinen byggde alfa ur ljusstyrkan och fick avgöra vad som
 * var bakgrund med en översvämning från bildkanten, eftersom
 * burgarens egna mörka partier annars blev genomskinliga och
 * konturtexten lyste igenom skuggan under bullen.
 *
 * Nu är källan en enda PNG med alfa, gjord som ett klistermärke.
 * Ingen nyckling behövs, ingen översvämning, ingen gissning om vad
 * som är motiv. Den koden är borta med källan den fanns för; ligger
 * kvar i git om en ny ofrilagd bild någon gång dyker upp.
 *
 * DET SOM ÄNDÅ MÅSTE GÖRAS: alfan är NÄSTAN ogenomskinlig, inte
 * ogenomskinlig. Mätt på källan ligger 984 754 pixlar på alfa 253 och
 * bara 1 648 på 255. 253 av 255 är 99,2 procent, alltså släpper
 * motivet igenom knappt en procent av det som ligger bakom — och
 * bakom den här bilden ligger konturtexten DELENS. Det är exakt den
 * genomlysning bilden togs fram för att bli av med.
 *
 * Därför snäpps alfan: allt över SNAPP blir helt ogenomskinligt. Den
 * äkta mjuka kanten går från 0 till full på några få pixlar och
 * ligger långt under tröskeln — den lämnas i fred, annars blir
 * siluetten hackig.
 *
 * KLISTERMÄRKETS VITA RAM TAS BORT, 2026-09-28. Källan har en vit
 * kontur på omkring 16 px runt hela burgaren, upp till 36 px i
 * inbuktningarna mellan kött och sallad. DELEN'S har ingen kontur och
 * BISTRO en tunn, så burgarens tjocka såg ojämn ut. Se utanRam().
 *
 * TVÅ FILER, SAMMA BESKÄRNING. B1 och B2 är inte längre två motiv
 * utan samma bild i två upplösningar. Hero-burgaren ritas som mest
 * 520 px bred på desktop och ~305 på mobil, och en telefon ska inte
 * hämta desktopfilen.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/hero/ny-hero.png';
const MAL = 'public/bilder/hero';

/** Två gångers pixeltäthet av respektive visningsbredd. */
const MAL_BREDD = { B1: 1100, B2: 700 };
const KVALITET = 82;

/**
 * Alfa över detta blir 255.
 *
 * 240, inte 250. Vid 250 blev 648 pixlar i B1 kvar på 244–249 — ett
 * genomsläpp på 2,7 procent, uppmätt, alltså osynligt i praktiken men
 * ändå inte det bilden togs fram för. Den äkta mjuka kanten löper
 * från 0 till full över flera pixlar och har sin massa långt under
 * 240, så tröskeln rör bara en sliver av rampens topp.
 */
const SNAPP = 240;

/** Marginal runt motivet, i andel av motivets bredd. */
const MARGINAL = 0.02;

/** Räknar äkta hål: delvis genomskinliga pixlar INNE i siluetten. */
async function inreHal(fil) {
  const { data, info } = await sharp(fil)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const a = (p) => data[p * C + 3];
  const natt = new Uint8Array(W * H);
  const ko = new Int32Array(W * H);
  let huvud = 0;
  let svans = 0;
  const salt = (p) => {
    if (natt[p] || a(p) >= SNAPP) return;
    natt[p] = 1;
    ko[svans++] = p;
  };
  for (let x = 0; x < W; x++) {
    salt(x);
    salt((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    salt(y * W);
    salt(y * W + W - 1);
  }
  while (huvud < svans) {
    const p = ko[huvud++];
    const x = p % W;
    const y = (p - x) / W;
    if (x > 0) salt(p - 1);
    if (x < W - 1) salt(p + 1);
    if (y > 0) salt(p - W);
    if (y < H - 1) salt(p + W);
  }
  let hal = 0;
  for (let p = 0; p < W * H; p++) if (a(p) < SNAPP && !natt[p]) hal++;
  return hal;
}

/**
 * Tar bort den vita ramen genom att fylla från bakgrunden och in.
 *
 * Allt som är genomskinligt eller VITT och hänger ihop med bildens
 * ytterkant räknas till ramen. Vitt betyder ljust och omättat: bullen
 * är orange, osten gul, salladen grön, så fyllningen stannar där
 * motivet börjar. Vita partier INNE i motivet nås inte, eftersom de
 * inte hänger ihop med utsidan.
 *
 * Övergången mellan ram och motiv är kantutjämnad — pixlar som är
 * delvis vita och delvis bulle. De ligger utanför tröskeln och blir
 * kvar som en ljus hårlinje. Därför vidgas det borttagna ett steg
 * till, KANT, och den nya kanten mjukas upp över en pixel så att
 * siluetten inte blir trappstegad.
 */
const RAM_LJUS = 170;
const RAM_MATTNAD = 50;
const KANT = 2;

function utanRam(data, W, H, C) {
  const ram = new Uint8Array(W * H);
  const ko = new Int32Array(W * H);
  let huvud = 0;
  let svans = 0;
  const arRam = (p) => {
    const i = p * C;
    if (data[i + 3] < 250) return true;
    const lo = Math.min(data[i], data[i + 1], data[i + 2]);
    const hi = Math.max(data[i], data[i + 1], data[i + 2]);
    return lo > RAM_LJUS && hi - lo < RAM_MATTNAD;
  };
  const salt = (p) => {
    if (ram[p] || !arRam(p)) return;
    ram[p] = 1;
    ko[svans++] = p;
  };
  for (let x = 0; x < W; x++) {
    salt(x);
    salt((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    salt(y * W);
    salt(y * W + W - 1);
  }
  while (huvud < svans) {
    const p = ko[huvud++];
    const x = p % W;
    const y = (p - x) / W;
    if (x > 0) salt(p - 1);
    if (x < W - 1) salt(p + 1);
    if (y > 0) salt(p - W);
    if (y < H - 1) salt(p + W);
  }

  // Vidga ramen KANT steg, så att kantutjämningens ljusa mix följer med.
  let nu = ram;
  for (let k = 0; k < KANT; k++) {
    const ny = nu.slice();
    for (let p = 0; p < W * H; p++) {
      if (nu[p]) continue;
      const x = p % W;
      if (
        (x > 0 && nu[p - 1]) ||
        (x < W - 1 && nu[p + 1]) ||
        (p >= W && nu[p - W]) ||
        (p < W * (H - 1) && nu[p + W])
      )
        ny[p] = 1;
    }
    nu = ny;
  }

  // Ny alfa: noll i ramen, halv på motivets yttersta pixel, full inuti.
  let borta = 0;
  for (let p = 0; p < W * H; p++) {
    const i = p * C + 3;
    if (nu[p]) {
      if (data[i] > 12) borta++;
      data[i] = 0;
      continue;
    }
    const x = p % W;
    const grannar =
      (x > 0 && nu[p - 1] ? 1 : 0) +
      (x < W - 1 && nu[p + 1] ? 1 : 0) +
      (p >= W && nu[p - W] ? 1 : 0) +
      (p < W * (H - 1) && nu[p + W] ? 1 : 0);
    if (grannar) data[i] = Math.min(data[i], grannar >= 2 ? 110 : 170);
  }
  return borta;
}

async function kor() {
  await mkdir(MAL, { recursive: true });

  const { data, info } = await sharp(KALLA)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  let heltFore = 0;
  let snappade = 0;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;

  for (let p = 0; p < W * H; p++) {
    const i = p * C + 3;
    const a = data[i];
    if (a === 255) heltFore++;
    if (a >= SNAPP && a < 255) {
      data[i] = 255;
      snappade++;
    }
    if (data[i] > 12) {
      const x = p % W;
      const y = (p - x) / W;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  /* Rutan ovan räknades MED ramen, och så ska det vara. Beskärningen
     står därmed kvar exakt som förut — samma proportion, samma
     width/height i index.html, samma läge för DELEN'S och BISTRO i
     lockupen. Burgaren blir några procent mindre i rutan, och det
     som försvinner är ramen, inget annat. */
  const ramBorta = utanRam(data, W, H, C);

  const mw = x1 - x0 + 1;
  const pad = Math.round(mw * MARGINAL);
  const left = Math.max(0, x0 - pad);
  const top = Math.max(0, y0 - pad);
  const width = Math.min(W - left, mw + pad * 2);
  const height = Math.min(H - top, y1 - y0 + 1 + pad * 2);

  const beskuren = await sharp(data, {
    raw: { width: W, height: H, channels: C }
  })
    .extract({ left, top, width, height })
    .png()
    .toBuffer();

  const kallstorlek = (await stat(KALLA)).size;
  const rader = [];

  for (const [id, bredd] of Object.entries(MAL_BREDD)) {
    const mal = path.join(MAL, id + '.webp');

    /* SNÄPPNINGEN GÖRS OM EFTER OMSKALNINGEN. lanczos3 ringer kring
       skarpa alfakanter och lägger tillbaka värden strax under 255
       inne i motivet — uppmätt 648 hål i B1 när snäppningen bara
       gjordes på källan. Skalan först, snäppet sedan, kodningen
       sist. */
    const skalad = await sharp(beskuren)
      .resize({ width: bredd, kernel: 'lanczos3' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sd = skalad.data;
    const sc = skalad.info.channels;
    for (let p = 0; p < skalad.info.width * skalad.info.height; p++) {
      const i = p * sc + 3;
      if (sd[i] >= SNAPP && sd[i] < 255) sd[i] = 255;
    }

    const ut = await sharp(sd, {
      raw: {
        width: skalad.info.width,
        height: skalad.info.height,
        channels: sc
      }
    })
      // alphaQuality 100: förstörande komprimerad alfa lägger tillbaka
      // exakt det brus snäppningen just tog bort.
      .webp({ quality: KVALITET, alphaQuality: 100, effort: 6 })
      .toFile(mal);

    rader.push(
      `${id}  ${ut.width}×${ut.height}  ${((await stat(mal)).size / 1024).toFixed(0)} kB`
    );
  }

  for (const r of rader) console.log(r);
  console.log(
    `\nkälla ${W}×${H}, ${(kallstorlek / 1048576).toFixed(2)} MB  →  ` +
      `beskuren ${width}×${height}, förhållande ${(width / height).toFixed(3)}`
  );
  console.log(`vit ram borttagen: ${ramBorta.toLocaleString('sv-SE')} pixlar`);
  console.log(
    `helt ogenomskinliga i källan ${heltFore.toLocaleString('sv-SE')}  ` +
      `snäppta till 255 ${snappade.toLocaleString('sv-SE')}`
  );
  for (const id of Object.keys(MAL_BREDD)) {
    console.log(`ÄKTA INRE HÅL i ${id}: ${await inreHal(path.join(MAL, id + '.webp'))}`);
  }
}

kor();

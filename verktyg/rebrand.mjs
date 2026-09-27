/**
 * Bildpipeline för rebrandrubriken.
 *
 *   node verktyg/rebrand.mjs
 *
 * RUBRIKEN ÄR TVÅ BILDER OCH ETT ORD. "Brutal Burgers blev Delen's
 * Bistro" var satt text; nu är de två namnen ritade — brutal-delens
 * (BRUTAL / BURGERS i rött) och delens-delens (Delen's i skrivstil
 * över BISTRO) — och ordet "blev" står kvar som text emellan. Se
 * .rebrand__rubrik i stilmallen. Originalen ligger orörda i
 * kalla/rebrand/.
 *
 * EN VIT KONTUR LÄGGS PÅ HÄR, och den är inte dekor. Sektionen är
 * djupröd, #6B1410, och bildernas röda står nästan i samma ton:
 *
 *   BRUTAL BURGERS   #C40C24   1,98:1 mot #6B1410
 *   Delen's          #DCBA91   6,62:1
 *   BISTRO           #B30405   1,69:1  — i praktiken osynligt
 *
 * Samma grepp som DELEN'S i hero och den satta lockupen före den:
 * formen bärs av en off-white kontur, och färgerna i bilden rörs
 * inte. Beslutat 2026-09-28.
 *
 * KONTUREN ÄR EN UTVIDGNING AV ALFAN, inte ett streck. Masken
 * suddas med σ = R/2 och tröskas där en rak kant hamnar R pixlar
 * utanför bokstaven; en mjuk ramp kring tröskeln ger konturen en
 * kantutjämnad ytterkant. Hörnen blir rundade av sig själva, vilket
 * är vad en tryckt klistermärkeskontur också gör.
 *
 * R är 0,75 procent av bildens bredd — omkring 3 px när bilden visas
 * i sin största storlek, samma synliga tjocklek som DELEN'S-konturen
 * i hero.
 *
 * DAMMET TAS BORT FÖRST. Källorna har lösa korn utanför bokstäverna,
 * och med en kontur hade varje korn blivit en vit prick. Masken delas
 * i sammanhängande ytor, och allt som är mindre än DAMM pixlar kastas
 * — alfan nollas där innan konturen räknas.
 *
 * ALFAN SNÄPPS, samma skäl som i verktyg/hero.mjs: bokstävernas
 * insida ligger på 240–254 och hade släppt igenom konturens vita.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLOR = 'kalla/rebrand';
const MAL = 'public/bilder/rebrand';

/** Konturens färg: sajtens off-white. */
const KONTUR = [0xf2, 0xeb, 0xe0];
/** Konturens radie som andel av den beskurna bildens bredd. */
const RADIE = 0.0075;
/** Minsta sammanhängande yta som räknas som bokstav, i källpixlar. */
const DAMM = 600;
const SNAPP = 240;
const BREDD = 900;
const KVALITET = 84;

const BILDER = [
  { kalla: 'brutal-delens.png', fil: 'brutal-burgers.webp' },
  { kalla: 'delens-delens.png', fil: 'delens-bistro.webp' }
];

/** Sammanhängande ytor i en binär mask; returnerar en mask utan de små. */
function utanDamm(mask, W, H) {
  const kvar = new Uint8Array(W * H);
  const sedd = new Uint8Array(W * H);
  const ko = new Int32Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || sedd[start]) continue;
    let hu = 0, sv = 0;
    ko[sv++] = start;
    sedd[start] = 1;
    while (hu < sv) {
      const p = ko[hu++];
      const x = p % W, y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q >= 0 && mask[q] && !sedd[q]) { sedd[q] = 1; ko[sv++] = q; }
      }
    }
    if (sv >= DAMM) for (let k = 0; k < sv; k++) kvar[ko[k]] = 1;
  }
  return kvar;
}

async function kor() {
  await mkdir(MAL, { recursive: true });

  for (const b of BILDER) {
    const { data, info } = await sharp(path.join(KALLOR, b.kalla))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;

    // 1 · Bokstäverna, utan damm.
    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
    const bokstav = utanDamm(mask, W, H);

    // Kantutjämningen runt en bokstav har låg alfa och hör till den;
    // allt annat med låg alfa är damm. Två pixlars marginal räcker.
    const nara = await sharp(Buffer.from(bokstav.map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } })
      .blur(1.5)
      .extractChannel(0)
      .raw()
      .toBuffer();
    for (let i = 0; i < W * H; i++) {
      if (!nara[i]) data[i * 4 + 3] = 0;
      else if (data[i * 4 + 3] >= SNAPP) data[i * 4 + 3] = 255;
    }

    // 2 · Beskär till bokstäverna plus plats för konturen.
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bokstav[y * W + x]) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    const R = Math.round((x1 - x0) * RADIE);
    const kant = R + 4;
    const ut = {
      left: Math.max(0, x0 - kant),
      top: Math.max(0, y0 - kant),
      width: Math.min(W, x1 + kant + 1) - Math.max(0, x0 - kant),
      height: Math.min(H, y1 + kant + 1) - Math.max(0, y0 - kant)
    };

    // 3 · Konturen: utvidgad mask, mjuk ytterkant.
    const sigma = R / 2;
    const suddad = await sharp(Buffer.from(bokstav.map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } })
      .blur(sigma)
      .extractChannel(0)
      .raw()
      .toBuffer();
    // En rak kant ligger på Φ(−R/σ) = Φ(−2) ≈ 0,023 R pixlar ut.
    const t = 0.023 * 255;
    const kontur = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const a = Math.max(0, Math.min(1, (suddad[i] - t * 0.5) / (t * 1.5)));
      kontur[i * 4] = KONTUR[0];
      kontur[i * 4 + 1] = KONTUR[1];
      kontur[i * 4 + 2] = KONTUR[2];
      kontur[i * 4 + 3] = Math.round(a * 255);
    }

    const ihop = await sharp(kontur, { raw: { width: W, height: H, channels: 4 } })
      .composite([{ input: data, raw: { width: W, height: H, channels: 4 } }])
      .raw()
      .toBuffer();

    const fil = path.join(MAL, b.fil);
    const r = await sharp(ihop, { raw: { width: W, height: H, channels: 4 } })
      .extract(ut)
      .resize({ width: BREDD })
      .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
      .toFile(fil);
    const kb = (await stat(fil)).size / 1024;
    console.log(`${b.fil}  ${r.width}×${r.height}  ${kb.toFixed(1)} kB  R=${R}px i källan  utklipp ${JSON.stringify(ut)}`);
  }
}

kor();

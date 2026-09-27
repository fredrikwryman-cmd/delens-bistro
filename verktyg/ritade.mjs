/**
 * Gemensamt för sajtens ritade ordbilder — hero-lockupen och
 * rebrandrubriken. Två steg som båda pipelinerna behöver:
 *
 *   rensa()   tar bort dammkorn och snäpper alfan
 *   kontur()  lägger en utvidgad kontur under bokstäverna
 *
 * Skälen står vid respektive funktion. Flyttat ur verktyg/rebrand.mjs
 * 2026-09-28 när hero-bilderna behövde samma rensning.
 */

import sharp from 'sharp';

/** Sammanhängande ytor i en binär mask; returnerar en mask utan de små. */
function utanDamm(mask, W, H, damm) {
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
    if (sv >= damm) for (let k = 0; k < sv; k++) kvar[ko[k]] = 1;
  }
  return kvar;
}

/**
 * DAMMET TAS BORT, OCH ALFAN SNÄPPS. Källorna har lösa korn utanför
 * bokstäverna och en ljus rest av tidigare konturer i kanterna. Mot
 * svart syns båda som brus, och under en kontur blir varje korn en vit
 * prick. Masken delas i sammanhängande ytor; allt mindre än `damm`
 * pixlar kastas, och låg alfa längre än två pixlar från en kvarvarande
 * bokstav nollas.
 *
 * Bokstävernas insida ligger på alfa 240–254 i alla källor hittills,
 * och det släpper igenom det som ligger bakom. Allt från `snapp` blir
 * helt ogenomskinligt — samma skäl som i verktyg/hero.mjs.
 *
 * Ändrar `data` (rå RGBA) på plats och returnerar bokstavsmasken.
 */
export async function rensa(data, W, H, { damm = 600, snapp = 240 } = {}) {
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = data[i * 4 + 3] >= 128 ? 1 : 0;
  const bokstav = utanDamm(mask, W, H, damm);

  const nara = await sharp(Buffer.from(bokstav.map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } })
    .blur(1.5)
    .extractChannel(0)
    .raw()
    .toBuffer();
  for (let i = 0; i < W * H; i++) {
    if (!nara[i]) data[i * 4 + 3] = 0;
    else if (data[i * 4 + 3] >= snapp) data[i * 4 + 3] = 255;
  }
  return bokstav;
}

/** Bokstavsmaskens yttre gränser. */
export function granser(bokstav, W, H) {
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (bokstav[y * W + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, x1, y0, y1 };
}

/**
 * KONTUREN ÄR EN UTVIDGNING AV ALFAN, inte ett streck. Masken suddas
 * med σ = R/2 och tröskas där en rak kant hamnar R pixlar utanför
 * bokstaven; en mjuk ramp kring tröskeln ger konturen en kantutjämnad
 * ytterkant. Hörnen blir rundade av sig själva, vilket är vad en
 * tryckt klistermärkeskontur också gör.
 *
 * Returnerar en ny rå RGBA-buffert: konturen med bilden ovanpå.
 */
export async function kontur(data, W, H, bokstav, R, farg) {
  const suddad = await sharp(Buffer.from(bokstav.map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } })
    .blur(R / 2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  // En rak kant ligger på Φ(−R/σ) = Φ(−2) ≈ 0,023 R pixlar ut.
  const t = 0.023 * 255;
  const lager = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const a = Math.max(0, Math.min(1, (suddad[i] - t * 0.5) / (t * 1.5)));
    lager[i * 4] = farg[0];
    lager[i * 4 + 1] = farg[1];
    lager[i * 4 + 2] = farg[2];
    lager[i * 4 + 3] = Math.round(a * 255);
  }
  return sharp(lager, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: data, raw: { width: W, height: H, channels: 4 } }])
    .raw()
    .toBuffer();
}

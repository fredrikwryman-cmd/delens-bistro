/**
 * Bildpipeline för hero-bilderna.
 *
 *   node verktyg/hero.mjs
 *
 * B1 och B2 levererades som JPEG mot en nästan svart botten, inte
 * frilagda. Bakgrunden mättes till rgb(2,10,10) i båda, alltså mörkare
 * än sektionens #0E0E0E och med ett svagt blågrönt stick — rött ligger
 * åtta steg under grönt och blått. Som rektangel ovanpå sektionen blir
 * det en synlig mörkare ruta runt burgaren.
 *
 * Lösningen är inte att färgjustera rutan utan att ta bort den: alfa
 * byggs ur ljusstyrkan, burgaren blir frilagd och sektionens egen
 * bakgrund lyser igenom. Då finns ingen ruta att matcha.
 *
 * Efter frilägningen beskärs den genomskinliga marginalen bort så att
 * bildrutan motsvarar motivet. Det gör hero-layouten förutsägbar i
 * stället för att texten måste kompensera för död yta.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/hero';
const MAL = 'public/bilder/hero';

/**
 * Målbredd per bild. Desktop ritar hero-burgaren som mest 520 px bred,
 * mobilen som mest ~305 px. 2× av vardera, avrundat uppåt.
 */
const MAL_BREDD = { B1: 1100, B2: 700 };
const KVALITET = 76;

/**
 * Nyckling mot den mörka bottnen.
 *   LO  under denna ljusstyrka är pixeln helt genomskinlig
 *   HI  över denna är den helt ogenomskinlig
 * Bakgrunden mäter ljusstyrka ~8. Ramp 14 → 34 ger en mjuk kant.
 *
 * MEN LJUSSTYRKA ENSAM RÄCKER INTE. Premissen "mörk betyder bakgrund"
 * gäller inte för en burgare: skuggan under bullen och de brända
 * kanterna på köttet är lika mörka som bottnen. De hamnade i rampen
 * och blev delvis genomskinliga — 193 692 pixlar i B1 låg mellan 14
 * och 34 — så konturtexten DELENS bakom burgaren lyste igenom motivets
 * mörkaste partier. Det såg ut som hål i burgaren, och det var det
 * första man såg på sidan.
 *
 * Rättningen är att avgöra bakgrund på SAMMANHANG i stället för på
 * ljusstyrka. Bakgrunden är den mörka yta som hänger ihop med
 * bildens kant. En mörk fläck inne i burgaren hänger inte ihop med
 * kanten — den är omsluten av motiv — och ska alltså vara kvar.
 *
 * Mätt på källan: ljusaste pixeln längs hela ramen är 15,1, så
 * motivet rör aldrig kanten och översvämningen kan inte läcka in i
 * burgaren.
 *
 * Rampen finns kvar, men bara INUTI den översvämmade ytan. Då
 * behåller silhuetten sin mjuka antialiasade kant samtidigt som allt
 * som inte är bakgrund är helt ogenomskinligt.
 */
const LO = 14;
const HI = 34;

/** Marginal som lämnas kvar runt motivet, i procent av motivets bredd. */
const MARGINAL = 0.03;

async function frilagg(fil) {
  const { data, info } = await sharp(fil).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  const lum = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * C;
    lum[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Ramens ljusaste pixel. Ligger den över HI rör motivet kanten och
  // översvämningen skulle läcka in i burgaren — då är bilden fel
  // beskuren och pipelinen ska säga ifrån, inte gissa.
  let ramMax = 0;
  for (let x = 0; x < W; x++) {
    ramMax = Math.max(ramMax, lum[x], lum[(H - 1) * W + x]);
  }
  for (let y = 0; y < H; y++) {
    ramMax = Math.max(ramMax, lum[y * W], lum[y * W + W - 1]);
  }
  if (ramMax >= HI) {
    throw new Error(
      `${fil}: motivet rör bildkanten (ljusaste rampixel ${ramMax.toFixed(1)} ` +
      `>= HI ${HI}). Beskär källan med marginal först.`
    );
  }

  /* Översvämning från ramen genom allt som är mörkare än HI. Det som
     nås är bakgrund; allt annat är motiv, hur mörkt det än är. Kön är
     en typad ringbuffert — en vanlig array med push/shift blir
     kvadratisk på fyra miljoner pixlar. */
  const bakgrund = new Uint8Array(W * H);
  const ko = new Int32Array(W * H);
  let huvud = 0;
  let svans = 0;
  const salt = (p) => {
    if (bakgrund[p] || lum[p] >= HI) return;
    bakgrund[p] = 1;
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

  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  let borttagna = 0;
  let raddade = 0;

  for (let p = 0; p < W * H; p++) {
    let a;
    if (bakgrund[p]) {
      a = (lum[p] - LO) / (HI - LO);
      a = a < 0 ? 0 : a > 1 ? 1 : a;
    } else {
      // Motiv. Mörkt motiv är fortfarande motiv.
      a = 1;
      if (lum[p] < HI) raddade++;
    }
    data[p * C + 3] = Math.round(a * 255);
    if (a === 0) {
      borttagna++;
      continue;
    }
    if (a > 0.5) {
      const x = p % W;
      const y = (p - x) / W;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  return { data, W, H, C, ruta: { x0, y0, x1, y1 }, borttagna, raddade, ramMax };
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const id of ['B1', 'B2']) {
    const kalla = path.join(KALLA, id + '.jpeg');
    const mal = path.join(MAL, id + '.webp');
    const fore = (await stat(kalla)).size;

    const { data, W, H, C, ruta, borttagna, raddade, ramMax } =
      await frilagg(kalla);

    // Beskär till motivet plus marginal.
    const mw = ruta.x1 - ruta.x0 + 1;
    const pad = Math.round(mw * MARGINAL);
    const left = Math.max(0, ruta.x0 - pad);
    const top = Math.max(0, ruta.y0 - pad);
    const width = Math.min(W - left, mw + pad * 2);
    const height = Math.min(H - top, ruta.y1 - ruta.y0 + 1 + pad * 2);

    await sharp(data, { raw: { width: W, height: H, channels: C } })
      .extract({ left, top, width, height })
      .resize({ width: MAL_BREDD[id], withoutEnlargement: true, kernel: 'lanczos3' })
      // alphaQuality 100. Vid 90 är alfakanalen förstörande komprimerad,
      // och bruset landar som delvis genomskinliga pixlar MITT I motivet
      // — uppmätt 20 042 i B1 och 36 708 i B2 efter att nycklingen
      // gjort dem helt ogenomskinliga. Exakt samma hål som just
      // rättades, återinförda av kodaren.
      .webp({ quality: KVALITET, alphaQuality: 100, effort: 6 })
      .toFile(mal);

    const efter = (await stat(mal)).size;
    const ny = await sharp(mal).metadata();

    rader.push({
      id,
      fore: `${W}×${H}`,
      efter: `${ny.width}×${ny.height}`,
      foreKB: Math.round(fore / 1024),
      efterKB: Math.round(efter / 1024),
      minskning: Math.round((1 - efter / fore) * 100) + ' %',
      bortklippt: `${W - width}×${H - height} px`,
      genomskinligt: Math.round(borttagna / (W * H) * 100) + ' %',
      // Mörka motivpixlar som ljusstyrkerampen ensam hade gjort
      // delvis genomskinliga, alltså hålen i burgaren.
      raddade: raddade.toLocaleString('sv-SE') + ' px',
      ramMax: ramMax.toFixed(1),
      alfa: ny.hasAlpha ? 'ja' : 'NEJ'
    });
  }

  console.table(rader);
  console.log(
    `Totalt: ${rader.reduce((s, r) => s + r.foreKB, 0)} kB → ` +
    `${rader.reduce((s, r) => s + r.efterKB, 0)} kB`
  );
}

kor();

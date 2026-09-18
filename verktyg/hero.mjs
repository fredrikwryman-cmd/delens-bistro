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
 * Bakgrunden mäter ljusstyrka ~8. Burgarens mörkaste kanter ligger
 * över 30, så ramp 14 → 34 skiljer dem åt utan att äta av motivet.
 */
const LO = 14;
const HI = 34;

/** Marginal som lämnas kvar runt motivet, i procent av motivets bredd. */
const MARGINAL = 0.03;

async function frilagg(fil) {
  const { data, info } = await sharp(fil).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  let borttagna = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      let a = (lum - LO) / (HI - LO);
      a = a < 0 ? 0 : a > 1 ? 1 : a;
      data[i + 3] = Math.round(a * 255);
      if (a === 0) { borttagna++; continue; }
      if (a > 0.5) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }

  return { data, W, H, C, ruta: { x0, y0, x1, y1 }, borttagna };
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const id of ['B1', 'B2']) {
    const kalla = path.join(KALLA, id + '.jpeg');
    const mal = path.join(MAL, id + '.webp');
    const fore = (await stat(kalla)).size;

    const { data, W, H, C, ruta, borttagna } = await frilagg(kalla);

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
      .webp({ quality: KVALITET, alphaQuality: 90, effort: 6 })
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

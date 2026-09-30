/**
 * Delningsbilden.
 *
 *   node verktyg/og.mjs
 *
 * 1200 × 630, under 1 MB (GV-09). KOMPONERAD, INTE UPPSKALAD. Den
 * tidigare bilden kom in färdig i 1024 × 541 och fick skalas upp 17 %.
 * Den här byggs ur sajtens egna högupplösta källor, som alla skalas
 * NED:
 *
 *   kalla/hero/B1.jpeg          2048 × 2048  burgaren, samma motiv som
 *                                            hjältebilden, mot nära svart
 *   kalla/granssnitt/logotyp.png 1254 × 1254 den runda logotypen
 *   kalla/hero/enjoy.png        1536 × 1024  Made To Enjoy-lockupen
 *
 * Inget nytt AI-material genereras här.
 *
 * LAYOUTEN TÅL BESKÄRNINGARNA. Facebook och LinkedIn visar 1,91:1 i
 * helhet. Tjänster som visar en kvadrat (WhatsApp, Slack, X:s lilla
 * kort) tar mitten, 630 × 630. Därför står burgaren ensam i mittens
 * kvadrat: den visar sig själv hela och bär varumärket på brödet.
 * Logotypen och lockupen står i sidfälten, som bara syns i 1,91:1, och
 * håller en marginal till kanten så att en tjänst som skär några
 * procent i sidled inte klipper dem.
 *
 * BAKGRUNDEN ÄR FOTOTS EGEN. B1 är fotad mot en nästan svart, lätt
 * grönstickig ton. Duken fylls med medelvärdet av fotots kantpixlar och
 * fotots sidokanter tonas ut mot den, så att det inte blir någon skarv
 * mellan foto och fält.
 *
 * Byts bilden ska ?v= i og:image och twitter:image höjas på alla sidor,
 * annars visar delningstjänsterna sin cachade kopia.
 */

import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const B = 1200;
const H = 630;
const UT = 'public/bilder/og/delens-og.jpg';

const FOTO = 'kalla/hero/B1.jpeg';
const LOGO = 'kalla/granssnitt/logotyp.png';
const LOCKUP = 'kalla/hero/enjoy.png';

/** Fotot som kvadrat i mitten; toningen mot sidorna i px. */
const FOTO_SIDA = H;
const TONING = 90;

/** Sidfälten: (1200 − 630) / 2 = 285 px, med 30 px luft mot kanten. */
const FALT = (B - FOTO_SIDA) / 2;
const LUFT = 30;

/** Medelfärgen längs fotots kant, som dukens färg. */
async function kantfarg(fil) {
  const { data, info } = await sharp(fil).resize(256, 256).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const summa = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x > 3 && x < info.width - 4 && y > 3 && y < info.height - 4) continue;
      const i = (y * info.width + x) * 3;
      for (let k = 0; k < 3; k++) summa[k] += data[i + k];
      n++;
    }
  }
  return summa.map((v) => Math.round(v / n));
}

/** Beskär bort genomskinlig kant, så att måtten gäller själva märket. */
async function tatt(fil) {
  return sharp(fil).trim({ threshold: 1 }).png().toBuffer();
}

const [r, g, b] = await kantfarg(FOTO);

// Fotot, nedskalat till kvadraten, med utonade sidokanter.
const toning = Buffer.from(
  `<svg width="${FOTO_SIDA}" height="${FOTO_SIDA}"><defs><linearGradient id="t">` +
    `<stop offset="0" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset="${TONING / FOTO_SIDA}" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset="${1 - TONING / FOTO_SIDA}" stop-color="#fff" stop-opacity="1"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
    `</linearGradient></defs><rect width="100%" height="100%" fill="url(#t)"/></svg>`
);
const foto = await sharp(FOTO)
  .resize(FOTO_SIDA, FOTO_SIDA, { kernel: 'lanczos3' })
  .ensureAlpha()
  .composite([{ input: toning, blend: 'dest-in' }])
  .png()
  .toBuffer();

// Logotypen i vänster fält, lockupen i höger, båda centrerade i fältet.
const faltBredd = FALT - 2 * LUFT;
const logo = await sharp(await tatt(LOGO)).resize(faltBredd, faltBredd, { fit: 'inside' }).png().toBuffer();
const lockup = await sharp(await tatt(LOCKUP)).resize(faltBredd, null, { fit: 'inside' }).png().toBuffer();
const [lm, km] = await Promise.all([sharp(logo).metadata(), sharp(lockup).metadata()]);

await sharp({ create: { width: B, height: H, channels: 3, background: { r, g, b } } })
  .composite([
    { input: foto, left: FALT, top: 0 },
    { input: logo, left: Math.round((FALT - lm.width) / 2), top: Math.round((H - lm.height) / 2) },
    { input: lockup, left: Math.round(B - FALT + (FALT - km.width) / 2), top: Math.round((H - km.height) / 2) }
  ])
  .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile(UT);

const { width, height } = await sharp(UT).metadata();
const kb = (await stat(UT)).size / 1024;
console.log(`${UT}  ${width}×${height}  ${kb.toFixed(1)} kB  duk rgb(${r} ${g} ${b})`);
if (width !== B || height !== H || kb >= 1024) process.exit(1);

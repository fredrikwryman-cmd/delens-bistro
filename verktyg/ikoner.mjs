/**
 * Sajtens ikoner.
 *
 *   node verktyg/ikoner.mjs
 *
 * TVÅ MÄRKEN, INTE ETT — och det är med flit.
 *
 *   favicon.ico   16, 32 och 48 px. Kundens egen fil, oförändrad: ett
 *                 rött D i en svart rondell. Den är ritad FÖR de här
 *                 graderna, och ett märke som är ritat för 16 px slår
 *                 allt man kan skala ned dit.
 *
 *   180 och 192   den runda logotypen i sin helhet, ur
 *                 kalla/granssnitt/logotyp.png (1254 px). Vid 180 px
 *                 finns det plats för hela ordmärket, och då ska hela
 *                 ordmärket stå där. Att i stället skala upp .ico-ns
 *                 48 px till 180 hade gett en fyra gånger förstorad
 *                 bild: mjuk kant, grumlig mitt.
 *
 * BOTTEN ÄR DJUPRÖD, INTE GENOMSKINLIG. iOS respekterar inte alfa i
 * hemskärmsikoner — det som är genomskinligt blir svart — och en
 * svart platta bakom en mörk rondell ger ett märke utan kontur.
 * Djuprött är samma färg som laddskärmen, alltså sajtens första
 * intryck också när den ligger på en hemskärm.
 *
 * Ingen 512 och ingen webmanifest. 512 används av manifestet, och
 * något manifest finns inte — att lägga en fil som ingenting läser är
 * att låtsas att sajten är installerbar.
 */

import sharp from 'sharp';
import { mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

const LOGOTYP = 'kalla/granssnitt/logotyp.png';
const ICO_KALLA = 'C:/Users/fredr/OneDrive/Desktop/Delens Bistro/favicon.ico';
const MAL = 'public';
const IKONMAPP = 'public/ikoner';

const ROD = { r: 0x6b, g: 0x14, b: 0x10, alpha: 1 };

/** Luft runt rondellen, i andel av ikonens sida. */
const LUFT = 0.08;

const STORLEKAR = [
  { fil: 'apple-touch-icon.png', px: 180 },
  { fil: 'ikon-192.png', px: 192 }
];

async function kor() {
  await mkdir(IKONMAPP, { recursive: true });

  await copyFile(ICO_KALLA, path.join(MAL, 'favicon.ico'));
  const ico = (await stat(path.join(MAL, 'favicon.ico'))).size;
  console.log(`favicon.ico  ${(ico / 1024).toFixed(1)} kB  (16, 32, 48 px, kundens fil)`);

  for (const { fil, px } of STORLEKAR) {
    const inre = Math.round(px * (1 - LUFT * 2));
    const marginal = Math.round((px - inre) / 2);

    const logga = await sharp(LOGOTYP)
      .trim({ threshold: 6 })
      .resize({ width: inre, height: inre, fit: 'contain', background: { ...ROD, alpha: 0 } })
      .png()
      .toBuffer();

    const mal = path.join(IKONMAPP, fil);
    await sharp({
      create: { width: px, height: px, channels: 4, background: ROD }
    })
      .composite([{ input: logga, top: marginal, left: marginal }])
      .png({ compressionLevel: 9 })
      .toFile(mal);

    const storlek = (await stat(mal)).size;
    console.log(`${fil}  ${px}×${px}  ${(storlek / 1024).toFixed(1)} kB`);
  }
}

kor();

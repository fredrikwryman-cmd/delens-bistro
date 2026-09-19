/**
 * Bildpipeline för gränssnittsgrafik.
 *
 *   node verktyg/granssnitt.mjs
 *
 * Bilder som är en del av gränssnittet självt, inte av innehållet.
 * Just nu en: muspekaren, en retrohandske i samma familj som
 * maskotarna — halvtonsraster, svart kontur, röd manschett.
 *
 * PEKARENS ANKARPUNKT MÄTS HÄR, inte gissas i stilmallen. En hand som
 * pekar har sin verkningspunkt i fingertoppen, och den punkten måste
 * ligga på pekarens faktiska läge — annars pekar handen bredvid det
 * som klickas. Skriptet skriver ut var toppen sitter i andel av
 * bilden, och den siffran är det som står i .led--huvud.
 *
 * Måttet: pekaren ritas 52 px bred, alltså 104 vid två gångers
 * pixeltäthet och 119 i hovertillståndets 1,14. 160 ger marginal.
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/granssnitt';
const MAL = 'public/bilder/granssnitt';

/**
 * Bredd per fil. Pekaren ritas 26 px och logotypen ~44; båda får
 * rejäl marginal för pixeltäthet utan att någon av dem bär den
 * andras mått.
 */
const MAL_BREDD = { muspekare: 160, logotyp: 180 };
const STANDARD_BREDD = 160;
const KVALITET = 82;
const TRIM_TROSKEL = 6;

/** Fingertoppen: mittpunkten i den översta ogenomskinliga raden. */
async function ankarpunkt(buffert) {
  const { data, info } = await sharp(buffert)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  for (let y = 0; y < H; y++) {
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * C + 3] > 120) {
        if (x0 < 0) x0 = x;
        x1 = x;
      }
    }
    if (x0 >= 0) return { x: (x0 + x1) / 2 / W, y: y / H };
  }
  return { x: 0.5, y: 0 };
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const filer = (await readdir(KALLA)).filter((f) => f.endsWith('.png')).sort();

  for (const fil of filer) {
    const id = path.basename(fil, '.png');
    const kalla = path.join(KALLA, fil);
    const mal = path.join(MAL, id + '.webp');

    const kallstorlek = (await stat(kalla)).size;
    const meta = await sharp(kalla).metadata();

    const beskuren = await sharp(kalla)
      .trim({ threshold: TRIM_TROSKEL })
      .png()
      .toBuffer();
    const ankare = await ankarpunkt(beskuren);

    const info = await sharp(beskuren)
      .resize({ width: MAL_BREDD[id] ?? STANDARD_BREDD })
      // alphaQuality 100: förstörande komprimerad alfa lägger brus som
      // delvis genomskinliga pixlar mitt i motivet.
      .webp({ quality: KVALITET, alphaQuality: 100, effort: 6 })
      .toFile(mal);

    const malstorlek = (await stat(mal)).size;

    console.log(
      `${id}  ${meta.width}×${meta.height} → ${info.width}×${info.height}  ` +
        `${(kallstorlek / 1024).toFixed(0)} kB → ${(malstorlek / 1024).toFixed(0)} kB`
    );
    console.log(
      `  ankarpunkt: x ${(ankare.x * 100).toFixed(1)} %  ` +
        `y ${(ankare.y * 100).toFixed(1)} %   ← ska stå i .led--huvud`
    );
  }
}

kor();

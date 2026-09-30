/**
 * Delningsbilden.
 *
 *   node verktyg/og.mjs
 *
 * 1200 × 630, under 1 MB (GV-09). Källan är kalla/og/delens-og-1024.jpg,
 * den bild som lades in 2026-09-28 i 1024 × 541. Någon större källa
 * finns inte; ny bild från kunden eller en ny rendering i full storlek
 * ska ersätta källfilen, och då körs skriptet igen.
 *
 * UPPSKALNING, INTE BESKÄRNING I FÖRSTA HAND. 1024 → 1200 är 17 %, och
 * lanczos3 håller kanterna rena i det steget. Förhållandet skiljer
 * något (1,893 mot 1,905), så bilden skalas till att täcka och
 * 4 px tas från höjden, jämnt fördelat. Ordmärket nere till höger har
 * 40 px marginal till kanten och påverkas inte.
 *
 * Byts bilden ska ?v= i og:image och twitter:image höjas på alla sidor,
 * annars visar delningstjänsterna sin cachade kopia.
 */

import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const KALLA = 'kalla/og/delens-og-1024.jpg';
const UT = 'public/bilder/og/delens-og.jpg';

await sharp(KALLA)
  .resize(1200, 630, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
  .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile(UT);

const { width, height } = await sharp(UT).metadata();
const kb = (await stat(UT)).size / 1024;
console.log(`${UT}  ${width}×${height}  ${kb.toFixed(1)} kB`);
if (width !== 1200 || height !== 630 || kb >= 1024) process.exit(1);

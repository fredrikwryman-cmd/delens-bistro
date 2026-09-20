/**
 * Bildpipeline för finalens hälsning.
 *
 *   node verktyg/valkommen.mjs
 *
 * ERSÄTTER SATT TEXT. Raden "Välkommen till Delens Bistro" stod i
 * Titan One och byggdes fram bokstav för bokstav. Nu är den en ritad
 * bubbeltyp i rött, och den kommer som en enhet — se .final__halsning
 * i stilmallen och PLAN.md 13.
 *
 * KÄLLAN ÄR MEST LUFT. PNG:n är 2170×725, men motivet ligger på
 * y 220–459: 220 px tom rad över och 265 under. Lagd rakt in hade
 * elementets låda blivit tre gånger så hög som bokstäverna, och
 * gridens gap hade mätt mot luft i stället för mot typen — hälsningen
 * hade sett ut att sitta löst under märket. Därför beskärs den mot
 * alfakanalen först, till 2112×240.
 *
 * BREDDEN ÄR 1216 OCH DET ÄR RÄKNAT. Hälsningen visas som mest i
 * 38rem, alltså 608 px, och 1216 är det dubbla — täcker en skärm med
 * dubbel pixeltäthet rakt av. En telefon når inte högre: 358 px
 * innanför sidmarginalerna gånger tre är 1074, som ryms under 1216.
 * Över det finns inget att hämta; källan är 2112 px bred efter
 * beskärningen och proportionen 8,8:1 gör höjden liten ändå.
 *
 * WEBP MED ALFA. Typen är frilagd och ska ligga på sektionens svarta
 * utan ruta omkring sig. Kvalitet 82: bubbeltypens kanter är mjuka
 * övergångar mot genomskinligt, och där syns artefakter tidigare än i
 * ett foto.
 */

import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA =
  'C:/Users/fredr/OneDrive/Desktop/Delens Bistro/välkommen-delens-animation.png';
const MAL = 'public/bilder/final';
const FIL = 'valkommen.webp';

/** Visas som mest i 38rem = 608 px. Dubbelt för pixeltäthet. */
const BREDD = 1216;
const KVALITET = 82;

async function kor() {
  await mkdir(MAL, { recursive: true });

  const ut = path.join(MAL, FIL);
  const info = await sharp(KALLA)
    // Beskär mot alfakanalen. Tröskeln är låg med flit: bubbeltypens
    // kant tonar ut, och en hög tröskel hade klippt av mjukkanten.
    .trim({ threshold: 8 })
    .resize({ width: BREDD, withoutEnlargement: true })
    .webp({ quality: KVALITET, effort: 6, alphaQuality: 100 })
    .toFile(ut);

  const b = (await stat(ut)).size;
  console.log(
    `${FIL}  ${info.width}×${info.height}  ${(b / 1024).toFixed(1)} kB`
  );
  console.log(`visas i högst 608 px, alltså ${(info.width / 608).toFixed(1)}x`);
}

kor();

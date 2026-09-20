/**
 * Bildpipeline för scroll-sekvensen.
 *
 *   node verktyg/sekvens.mjs
 *
 * KODAR OM FRÅN VIDEON, INTE FRÅN JPG-ERNA. De 240 JPG-filerna som
 * följde med är exporterade ur ezgif och redan komprimerade en gång;
 * att göra WebP av dem hade staplat artefakter på artefakter. Videon
 * är dessutom 24 FPS i 8,00 sekunder, alltså 192 ÄKTA bildrutor — de
 * 240 filerna är uppsamplade, och ungefär var femte är en dubblett
 * eller en interpolation. Att scrubba genom dubbletter ser ut som att
 * animationen hakar upp sig.
 *
 * TVÅ UPPSÄTTNINGAR OCH EN STILL.
 *
 *   desktop  120 rutor, 800 px bredd
 *   mobil     80 rutor, 640 px bredd
 *   still      1 ruta, sista bilden
 *
 * Talen hänger ihop med scrollsträckan, inte med sekunder. Jämnheten
 * avgörs av hur många pixlar man scrollar per bildruta:
 *
 *   120 rutor över 250svh på 844 px vy  =  17,6 px per ruta
 *    80 rutor över 200svh på 844 px vy  =  21,1 px per ruta
 *
 * Till jämförelse: 240 rutor över 400svh ger 14 px. Skillnaden är
 * marginell för ögat och halva vikten.
 *
 * VÄGEN ÄR VIDEO → PNG → WEBP. ffmpeg skalar och plockar rutor,
 * lossless PNG som mellanled, och sharp gör WebP. Ett enda
 * förstörande steg, sist.
 *
 * WEBP OCH INTE AVIF, trots att AVIF mätte 34 procent lättare på just
 * det här materialet (1904 mot 2904 kB). Två skäl. AVIF avkodas två
 * till tre gånger långsammare, och det som avkodas här ska hinna fram
 * mellan två bildrutor medan någon scrollar. Och en webbläsare som
 * inte kan AVIF — iOS före 16.4 — får inte en sämre bild utan en tom
 * duk. På en restaurangsajt är den andelen telefoner inte försumbar.
 *
 * KVALITETEN ÄR 66 OCH KURVAN ÄR PLATT. Uppmätt på fem rutor:
 * q80 3536 kB, q74 2904, q68 2685, q62 2504, q48 2145. Att gå från 74
 * till 48 sparar en fjärdedel och kostar synlig kvalitet på köttet.
 * Brusreducering före kodning (hqdn3d) provades också och gav 6
 * procent — det är alltså inte korn som väger, det är neonets glöd
 * och röken, alltså riktig bild. Då finns ingen gratis besparing och
 * 66 är den punkt där kurvan planar ut.
 *
 * STILLEN ÄR INTE DEKOR. Den är reservvägen för reducerad rörelse,
 * Save-Data och långsam uppkoppling — se riggaSekvens i main.js. Utan
 * den blir sektionen en tom duk för den som valt bort rörelse.
 */

import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const korProgram = promisify(execFile);

const VIDEO =
  'C:/Users/fredr/OneDrive/Desktop/Delens Bistro/delens-scroll-animation.mp4';
const MAL = 'public/bilder/sekvens';
const TILLFALLIG = 'public/bilder/sekvens/.rapng';

/** Videons längd i sekunder. Styr fps-filtret som ger rätt antal rutor. */
const LANGD = 8;

const UTGAVOR = [
  { id: 'desktop', rutor: 120, bredd: 800, kvalitet: 66 },
  { id: 'mobil', rutor: 80, bredd: 640, kvalitet: 66 }
];

/** Stillen: sista bilden, alltså den färdiga burgaren. */
const STILL = { bredd: 1200, kvalitet: 80 };

async function plockaRutor(bredd, rutor, mapp) {
  await rm(mapp, { recursive: true, force: true });
  await mkdir(mapp, { recursive: true });
  // fps = rutor / längd ger jämnt fördelade bildrutor över hela klippet.
  // scale med -2 håller proportionerna och jämnt tal på höjden, som
  // h264 och webp båda vill ha.
  await korProgram(ffmpeg, [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', VIDEO,
    '-vf', `fps=${rutor / LANGD},scale=${bredd}:-2:flags=lanczos`,
    '-frames:v', String(rutor),
    '-fps_mode', 'passthrough',
    path.join(mapp, 'r%04d.png')
  ]);
  return (await readdir(mapp)).filter((f) => f.endsWith('.png')).sort();
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const u of UTGAVOR) {
    const mapp = path.join(TILLFALLIG, u.id);
    const filer = await plockaRutor(u.bredd, u.rutor, mapp);

    const utmapp = path.join(MAL, u.id);
    await rm(utmapp, { recursive: true, force: true });
    await mkdir(utmapp, { recursive: true });

    let summa = 0;
    let minsta = Infinity;
    let storsta = 0;
    let bredd = 0;
    let hojd = 0;

    for (let i = 0; i < filer.length; i++) {
      const ut = path.join(utmapp, `r${String(i + 1).padStart(3, '0')}.webp`);
      const info = await sharp(path.join(mapp, filer[i]))
        .webp({ quality: u.kvalitet, effort: 6 })
        .toFile(ut);
      bredd = info.width;
      hojd = info.height;
      const b = (await stat(ut)).size;
      summa += b;
      minsta = Math.min(minsta, b);
      storsta = Math.max(storsta, b);
    }

    rader.push({
      utgava: u.id,
      rutor: filer.length,
      matt: `${bredd}×${hojd}`,
      totaltKB: Math.round(summa / 1024),
      snittKB: +(summa / filer.length / 1024).toFixed(1),
      minstaKB: +(minsta / 1024).toFixed(1),
      storstaKB: +(storsta / 1024).toFixed(1),
      // Avkodat i minnet: bredd × höjd × 4 byte per ruta.
      avkodadRutaMB: +((bredd * hojd * 4) / 1048576).toFixed(2)
    });

    await rm(mapp, { recursive: true, force: true });
  }

  // Stillen ur sista bildrutan.
  const stillmapp = path.join(TILLFALLIG, 'still');
  await rm(stillmapp, { recursive: true, force: true });
  await mkdir(stillmapp, { recursive: true });
  await korProgram(ffmpeg, [
    '-hide_banner',
    '-loglevel', 'error',
    '-sseof', '-0.2',
    '-i', VIDEO,
    '-vf', `scale=${STILL.bredd}:-2:flags=lanczos`,
    '-frames:v', '1',
    path.join(stillmapp, 'still.png')
  ]);
  const stillUt = path.join(MAL, 'still.webp');
  const si = await sharp(path.join(stillmapp, 'still.png'))
    .webp({ quality: STILL.kvalitet, effort: 6 })
    .toFile(stillUt);
  const sb = (await stat(stillUt)).size;
  await rm(stillmapp, { recursive: true, force: true });
  await rm(TILLFALLIG, { recursive: true, force: true });

  console.table(rader);
  console.log(
    `still  ${si.width}×${si.height}  ${(sb / 1024).toFixed(0)} kB`
  );
  const allt = rader.reduce((s, r) => s + r.totaltKB, 0) + sb / 1024;
  console.log(`\nHELA SEKVENSEN: ${Math.round(allt)} kB`);
  console.log(
    `en besökare hämtar EN uppsättning: ` +
      rader.map((r) => `${r.utgava} ${r.totaltKB} kB`).join(', ')
  );
}


kor();

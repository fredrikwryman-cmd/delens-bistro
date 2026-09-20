/**
 * Bildpipeline för scroll-sekvensen.
 *
 *   node verktyg/sekvens.mjs
 *
 * KODAR OM FRÅN VIDEON, INTE FRÅN JPG-ERNA. De 240 JPG-filerna i
 * undermappen "scroll animation" är exporterade ur ezgif och redan
 * komprimerade en gång; att göra WebP av dem hade staplat artefakter
 * på artefakter. Videon är dessutom 24 FPS i 8,00 sekunder, alltså
 * 192 ÄKTA bildrutor — de 240 filerna är uppsamplade, och ungefär var
 * femte är en dubblett eller en interpolation. Att scrubba genom
 * dubbletter ser ut som att animationen hakar upp sig.
 *
 * SÖKVÄGEN HETER Desktop PÅ DISK, inte Skrivbord. Utforskaren visar
 * det lokaliserade namnet, men mappen på disk heter Desktop och det
 * är den som går att öppna. Skriptet kastar med tydlig text om filen
 * inte finns, i stället för att låta ffmpeg falla på ett kryptiskt
 * fel — en tyst miss här ger en hel sekvens av fel bilder.
 *
 * TVÅ UPPSÄTTNINGAR OCH EN STILL, ALLA I KÄLLANS FULLA BREDD.
 *
 *   desktop  120 rutor, 1280 px bredd
 *   mobil     80 rutor, 1280 px bredd
 *   still      1 ruta, 1280 px bredd
 *
 * 1280 ÄR TAKET, INTE ETT VAL. Videon är 1280×720 och mer detalj
 * finns inte; att skala över det hade gett större filer utan en enda
 * ny pixel.
 *
 * MOBILEN FÅR SAMMA BREDD SOM DESKTOP, och det är inte ett slarv.
 * Förut var det 800 och 640, uträknat när sekvensen låg i en ruta som
 * var smalare än vyn. Nu täcker den hela vyn med object-fit: cover,
 * och då gäller motsatt räkning: en stående telefon beskär bort
 * sidorna och visar bara omkring 26 procent av rutans bredd, utsträckt
 * över hela skärmen. Telefonen behöver alltså MER källbredd än
 * desktop, inte mindre. Uppmätt behov för en pixel per pixel:
 *
 *   laptop 1490×867           1541 px   —  800 gav 52 procent
 *   telefon 390×844 vid 3x    4501 px   —  640 gav 14 procent
 *
 * Det är de 52 och 14 procenten som syntes som grynighet: en bild
 * förstorad nära dubbelt respektive sju gånger. Vid 1280 blir samma
 * tal 83 och 28 procent. Telefonen når aldrig ett mot ett — det
 * kräver en källa på 4500 px som inte finns — men steget från sju
 * gångers förstoring till tre och en halv är det som går att ta.
 *
 * VÄGEN ÄR VIDEO → PNG → WEBP. ffmpeg plockar och skalar, lossless
 * PNG som mellanled, och sharp gör WebP. Ett enda förstörande steg,
 * sist.
 *
 * RUTORNA VÄLJS PÅ NUMMER, INTE MED fps-FILTRET. Källan har exakt 192
 * rutor, så ruta i av n hämtas som källruta round(i × 191 / (n−1)).
 * Det ger jämn spridning och garanterat inga dubbletter. fps-filtret
 * räknar i stället om tidsstämplar, och delas passet upp i omgångar
 * börjar filtret om sin fas vid varje sökning — en ruta glider, och
 * en glidning mitt i en scrubbad sekvens syns som ett hack.
 *
 * PASSET GÅR I OMGÅNGAR om 20 rutor. En omgång i taget plockas ut,
 * kodas och städas bort innan nästa börjar. Hela uppsättningen som
 * PNG samtidigt vore 120 × 2,7 MB ≈ 320 MB på disk i ett svep; med
 * omgångar ligger toppen på omkring 54 MB.
 *
 * WEBP OCH INTE AVIF, trots att AVIF mätte 34 procent lättare på just
 * det här materialet. Två skäl. AVIF avkodas två till tre gånger
 * långsammare, och det som avkodas här ska hinna fram mellan två
 * bildrutor medan någon scrollar. Och en webbläsare som inte kan AVIF
 * — iOS före 16.4 — får inte en sämre bild utan en tom duk. På en
 * restaurangsajt är den andelen telefoner inte försumbar.
 *
 * KVALITETEN ÄR 66 OCH KURVAN ÄR PLATT. Uppmätt på sex rutor i 1280,
 * omräknat till desktopens 120: q58 4,26 MB, q62 4,45, q66 4,64,
 * q72 5,02, q78 5,78. Mellan 58 och 66 skiljer nio procent, och 66 är
 * samma punkt som mätningen i 800 en gång landade på.
 *
 * STILLEN ÄR INTE DEKOR. Den är reservvägen för reducerad rörelse,
 * Save-Data och långsam uppkoppling — se riggaSekvens i main.js. Utan
 * den blir sektionen en tom duk för den som valt bort rörelse.
 */

import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, rm, stat, access } from 'node:fs/promises';
import path from 'node:path';

const korProgram = promisify(execFile);

const VIDEO =
  'C:/Users/fredr/OneDrive/Desktop/Delens Bistro/delens-scroll-animation.mp4';
const MAL = 'public/bilder/sekvens';
const TILLFALLIG = 'public/bilder/sekvens/.rapng';

/** Källans antal bildrutor. 24 FPS × 8,00 s. */
const KALLRUTOR = 192;

/** Rutor per omgång. Håller toppen på disk nere, se huvudtexten. */
const OMGANG = 20;

const UTGAVOR = [
  { id: 'desktop', rutor: 120, bredd: 1280, kvalitet: 66 },
  { id: 'mobil', rutor: 80, bredd: 1280, kvalitet: 66 }
];

/** Stillen: sista bilden, alltså den färdiga burgaren. */
const STILL = { bredd: 1280, kvalitet: 80 };

/** Källrutans nummer för ruta i av totalt n, jämnt spritt över klippet. */
const kallruta = (i, n) =>
  n <= 1 ? 0 : Math.round((i * (KALLRUTOR - 1)) / (n - 1));

/**
 * Plockar ut en omgång källrutor med select-filtret och skalar dem.
 * Filnamnen blir löpande inom omgången; anroparen sätter rätt namn.
 */
async function plockaOmgang(nummer, bredd, mapp) {
  // select='eq(n,3)+eq(n,5)+…' — exakta rutnummer, ingen tidsräkning.
  const villkor = nummer.map((n) => 'eq(n\\,' + n + ')').join('+');
  await korProgram(ffmpeg, [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', VIDEO,
    '-vf', `select='${villkor}',scale=${bredd}:-2:flags=lanczos`,
    // vsync 0 låter varje vald ruta komma ut som den är, utan att
    // ffmpeg fyller på eller släpper rutor för att träffa en fps.
    '-vsync', '0',
    path.join(mapp, 'o%04d.png')
  ]);
  return (await readdir(mapp)).filter((f) => f.endsWith('.png')).sort();
}

async function kor() {
  try {
    await access(VIDEO);
  } catch {
    throw new Error(
      `Hittar inte videon:\n  ${VIDEO}\n` +
        'Mappen heter Desktop på disk även om Utforskaren visar Skrivbord.'
    );
  }

  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const u of UTGAVOR) {
    const utmapp = path.join(MAL, u.id);
    await rm(utmapp, { recursive: true, force: true });
    await mkdir(utmapp, { recursive: true });

    let summa = 0;
    let minsta = Infinity;
    let storsta = 0;
    let bredd = 0;
    let hojd = 0;

    for (let start = 0; start < u.rutor; start += OMGANG) {
      const slut = Math.min(start + OMGANG, u.rutor);
      const nummer = [];
      for (let i = start; i < slut; i++) nummer.push(kallruta(i, u.rutor));

      const mapp = path.join(TILLFALLIG, u.id);
      await rm(mapp, { recursive: true, force: true });
      await mkdir(mapp, { recursive: true });

      const filer = await plockaOmgang(nummer, u.bredd, mapp);
      if (filer.length !== nummer.length) {
        throw new Error(
          `${u.id}: bad om ${nummer.length} rutor, fick ${filer.length}`
        );
      }

      for (let j = 0; j < filer.length; j++) {
        const i = start + j;
        const ut = path.join(utmapp, `r${String(i + 1).padStart(3, '0')}.webp`);
        const info = await sharp(path.join(mapp, filer[j]))
          .webp({ quality: u.kvalitet, effort: 6 })
          .toFile(ut);
        bredd = info.width;
        hojd = info.height;
        const b = (await stat(ut)).size;
        summa += b;
        minsta = Math.min(minsta, b);
        storsta = Math.max(storsta, b);
      }

      await rm(mapp, { recursive: true, force: true });
      process.stdout.write(`  ${u.id}: ${slut}/${u.rutor}\r`);
    }
    process.stdout.write('\n');

    rader.push({
      utgava: u.id,
      rutor: u.rutor,
      matt: `${bredd}×${hojd}`,
      totaltKB: Math.round(summa / 1024),
      snittKB: +(summa / u.rutor / 1024).toFixed(1),
      minstaKB: +(minsta / 1024).toFixed(1),
      storstaKB: +(storsta / 1024).toFixed(1),
      // Avkodat i minnet: bredd × höjd × 4 byte per ruta.
      avkodadRutaMB: +((bredd * hojd * 4) / 1048576).toFixed(2)
    });
  }

  // Stillen ur sista bildrutan.
  const stillmapp = path.join(TILLFALLIG, 'still');
  await rm(stillmapp, { recursive: true, force: true });
  await mkdir(stillmapp, { recursive: true });
  await plockaOmgang([KALLRUTOR - 1], STILL.bredd, stillmapp);
  const stillUt = path.join(MAL, 'still.webp');
  const si = await sharp(path.join(stillmapp, 'o0001.png'))
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

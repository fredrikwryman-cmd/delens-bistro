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
 * TVÅ VIDEOR, TVÅ UPPSÄTTNINGAR, TVÅ STILLAR.
 *
 *   desktop   80 rutor, 1280 × 720   ur delens-scroll-animation.mp4
 *   mobil    150 rutor,  360 × 640   ur ny-scroll-mobil.mp4
 *
 * Varje uppsättning har sin still ur sista rutan: still.webp och
 * still-mobil.webp.
 *
 * MOBILEN HAR EN EGEN, STÅENDE VIDEO sedan 2026-09-28, 9:16. Förut
 * beskar telefonen den liggande videon hårt i sidled och visade
 * omkring 26 procent av bredden. Nu visar den 82 procent.
 *
 * NY-SCROLL-MOBIL ÄR 360 × 640, 10 s och 240 rutor. Den ersatte samma
 * dag delens-scroll-mobil, som var 720 × 1280, 8 s och 192 rutor.
 * 360 är källans fulla bredd och alltså taket: att skala upp hade gett
 * större filer utan en enda ny pixel. Det ger 0,76 källpixlar per
 * CSS-pixel på en 390 px telefon, mot 1,5 med den förra videon, och
 * bilden är mjukare än den var. Blir en större export av samma video
 * tillgänglig räcker det att byta filen och bredden här.
 *
 * Varje video har sitt eget antal källrutor (kallrutor i UTGAVOR), så
 * att rutorna sprids jämnt över just den videon.
 *
 * svart i UTGAVOR lyfter allt under ett värde till det värdet. Det
 * behövdes för delens-scroll-mobil, som började med helt svarta fält
 * mot sektionens #0E0E0E. ny-scroll-mobil fyller bilden från första
 * rutan och behöver det inte.
 *
 * ANTALET SÄTTS AV SCROLLEN, INTE AV KÄLLAN. Rutorna ska räcka till
 * omkring 18 px scroll per ruta i det klistrade läget — väl under
 * ungefär 25 px, där rörelsen slutar läsa som film. Klistringen är
 * spårets höjd minus scenens, och 92,5 procent av rutorna ligger i
 * den (se SEKV.klistratSlut i main.js):
 *
 *   desktop  900 px vy:  1350 px / (0,925 × 79) = 18,5 px per ruta
 *   mobil    844 px vy:  2954 px / (0,925 × 149) = 21,4 px per ruta
 *   mobil    932 px vy:  3262 px / (0,925 × 149) = 23,7 px per ruta
 *
 * Mobilens spår förlängdes 2026-09-28 från 218svh till 450svh, så att
 * sekvensen tar tre gånger så lång tid att scrolla igenom. Rutorna
 * ökades samtidigt från 59 till 150, så att takten stannar under 25 px
 * även på den högsta vanliga telefonen, 932 px. Med 134 blev den 26,4.
 * Källan har 240 rutor, så det finns utrymme.
 *
 * Förut var det 120 och 80 rutor, alltså 11,9 och 13,2 px. Steget
 * tog sekvensen från 4,94 till 3,29 MB på desktop och från 3,29 till
 * 2,43 MB på mobil, med upplösningen orörd — det var den som löste
 * grynigheten, och den är inte med i den här räkningen.
 *
 * 1280 ÄR TAKET, INTE ETT VAL. Videon är 1280×720 och mer detalj
 * finns inte; att skala över det hade gett större filer utan en enda
 * ny pixel.
 *
 * DEN LIGGANDE VIDEON PÅ TELEFON gav omkring 0,85 källpixlar per
 * CSS-pixel, 28 procent av vad en telefon med tredubbel täthet behöver
 * för en pixel per pixel. Det var det som syntes som gryn. Den stående
 * videon ger 1,5, alltså halva vägen. Mer finns inte i källan.
 *
 * VÄGEN ÄR VIDEO → WEBP, i ett enda ffmpeg-pass. ffmpeg plockar
 * rutorna, skalar och kodar med libwebp. Inget mellanled på disk och
 * bara ett förstörande steg. Förut gick vägen över lossless PNG och
 * sharp. Desktopens rutor från 2026-09-27 är gjorda så och har inte
 * kodats om; de kodas om med den här vägen nästa gång desktop körs.
 *
 * RUTORNA VÄLJS PÅ NUMMER, INTE MED fps-FILTRET. Källan har exakt 192
 * rutor, så ruta i av n hämtas som källruta round(i × 191 / (n−1)).
 * Det ger jämn spridning och garanterat inga dubbletter. fps-filtret
 * räknar i stället om tidsstämplar, och delas passet upp i omgångar
 * börjar filtret om sin fas vid varje sökning — en ruta glider, och
 * en glidning mitt i en scrubbad sekvens syns som ett hack.
 *
 * Kör en uppsättning i taget genom att namnge den:
 *
 *   node verktyg/sekvens.mjs mobil
 *
 * WEBP OCH INTE AVIF, trots att AVIF mätte 34 procent lättare på just
 * det här materialet. Två skäl. AVIF avkodas två till tre gånger
 * långsammare, och det som avkodas här ska hinna fram mellan två
 * bildrutor medan någon scrollar. Och en webbläsare som inte kan AVIF
 * — iOS före 16.4 — får inte en sämre bild utan en tom duk. På en
 * restaurangsajt är den andelen telefoner inte försumbar.
 *
 * KVALITETEN ÄR 66 OCH KURVAN ÄR PLATT. Uppmätt på sex rutor i 1280,
 * omräknat till en uppsättning om 120: q58 4,26 MB, q62 4,45, q66 4,64,
 * q72 5,02, q78 5,78. Mellan 58 och 66 skiljer nio procent, och 66 är
 * samma punkt som mätningen i 800 en gång landade på.
 *
 * STILLEN ÄR INTE DEKOR. Den är reservvägen för reducerad rörelse,
 * Save-Data och långsam uppkoppling — se riggaSekvens i main.js. Utan
 * den blir sektionen en tom duk för den som valt bort rörelse.
 */

import ffmpeg from 'ffmpeg-static';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, rm, stat, access } from 'node:fs/promises';
import path from 'node:path';

const korProgram = promisify(execFile);

const KALLMAPP = 'C:/Users/fredr/OneDrive/Desktop/Delens Bistro';
const MAL = 'public/bilder/sekvens';


/**
 * En uppsättning per video. Mobilen har en egen, stående video sedan
 * 2026-09-28; se huvudtexten.
 *
 * svart: det lägsta värde en färgkanal får ha. Mobilvideon börjar med
 * svarta fält över och under bilden, 0,0,0, mot sektionens #0E0E0E.
 * Allt under 14 lyfts till 14, så fälten blir sektionens egen svarta
 * och smälter in i kanttoningarna. Bildens mörkaste partier ligger
 * kring 4–12 och flyttas alltså högst några steg.
 */
const UTGAVOR = [
  {
    id: 'desktop',
    video: 'delens-scroll-animation.mp4',
    kallrutor: 192, // 24 FPS × 8,00 s
    rutor: 80,
    bredd: 1280,
    kvalitet: 66,
    still: 'still.webp'
  },
  {
    id: 'mobil',
    video: 'ny-scroll-mobil.mp4',
    kallrutor: 240, // 24 FPS × 10,01 s
    rutor: 150,
    bredd: 360,
    kvalitet: 66,
    still: 'still-mobil.webp'
  }
];

/** Stillens kvalitet. Stillen är sista bilden, den färdiga burgaren. */
const STILL_KVALITET = 80;

/** Källrutans nummer för ruta i av totalt n, jämnt spritt över klippet. */
const kallruta = (i, n, kallrutor) =>
  n <= 1 ? 0 : Math.round((i * (kallrutor - 1)) / (n - 1));

/** Filterkedjan: exakta rutnummer, skalning och ev. lyft svart. */
function filter(nummer, u) {
  // select='eq(n,3)+eq(n,5)+…' — exakta rutnummer, ingen tidsräkning.
  const villkor = nummer.map((n) => 'eq(n\\,' + n + ')').join('+');
  const delar = [`select='${villkor}'`, `scale=${u.bredd}:-2:flags=lanczos`];
  if (u.svart) {
    const lyft = `'if(lt(val\\,${u.svart})\\,${u.svart}\\,val)'`;
    delar.push(`lutrgb=r=${lyft}:g=${lyft}:b=${lyft}`);
  }
  return delar.join(',');
}

/**
 * Plockar rutorna ur videon och skriver WebP direkt, i ett enda pass.
 * Ingen PNG emellan: ffmpeg avkodar, filtrerar och kodar med libwebp.
 */
async function extrahera(u, nummer, mal, { kvalitet = u.kvalitet, enstaka = false } = {}) {
  await korProgram(ffmpeg, [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', path.join(KALLMAPP, u.video),
    '-vf', filter(nummer, u),
    // vsync 0 låter varje vald ruta komma ut som den är, utan att
    // ffmpeg fyller på eller släpper rutor för att träffa en fps.
    '-vsync', '0',
    '-an',
    '-c:v', 'libwebp',
    '-lossless', '0',
    '-quality', String(kvalitet),
    '-compression_level', '6',
    '-preset', 'picture',
    // En enstaka bild skrivs till ett fast namn; en serie numreras
    // från r001, som main.js hämtar dem.
    ...(enstaka ? ['-frames:v', '1', '-update', '1'] : ['-start_number', '1']),
    mal
  ]);
}

async function kor() {
  // Vilka uppsättningar som körs: alla, eller de som namnges.
  //   node verktyg/sekvens.mjs mobil
  const valda = process.argv.slice(2);
  const korda = valda.length ? UTGAVOR.filter((u) => valda.includes(u.id)) : UTGAVOR;
  if (!korda.length) throw new Error(`Okänd uppsättning: ${valda.join(', ')}`);

  for (const u of korda) {
    const video = path.join(KALLMAPP, u.video);
    try {
      await access(video);
    } catch {
      throw new Error(
        `Hittar inte videon:\n  ${video}\n` +
          'Mappen heter Desktop på disk även om Utforskaren visar Skrivbord.'
      );
    }
  }

  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const u of korda) {
    const utmapp = path.join(MAL, u.id);
    await rm(utmapp, { recursive: true, force: true });
    await mkdir(utmapp, { recursive: true });

    const nummer = Array.from({ length: u.rutor }, (_, i) => kallruta(i, u.rutor, u.kallrutor));
    await extrahera(u, nummer, path.join(utmapp, 'r%03d.webp'));

    const filer = (await readdir(utmapp)).filter((f) => f.endsWith('.webp')).sort();
    if (filer.length !== u.rutor) {
      throw new Error(`${u.id}: bad om ${u.rutor} rutor, fick ${filer.length}`);
    }

    const storlekar = await Promise.all(filer.map(async (f) => (await stat(path.join(utmapp, f))).size));
    const summa = storlekar.reduce((s, b) => s + b, 0);

    const stillUt = path.join(MAL, u.still);
    await extrahera(u, [u.kallrutor - 1], stillUt, { kvalitet: STILL_KVALITET, enstaka: true });

    rader.push({
      utgava: u.id,
      rutor: u.rutor,
      bredd: u.bredd,
      totaltKB: Math.round(summa / 1024),
      snittKB: +(summa / u.rutor / 1024).toFixed(1),
      minstaKB: +(Math.min(...storlekar) / 1024).toFixed(1),
      storstaKB: +(Math.max(...storlekar) / 1024).toFixed(1),
      stillKB: Math.round((await stat(stillUt)).size / 1024)
    });
  }

  console.table(rader);
}

kor();

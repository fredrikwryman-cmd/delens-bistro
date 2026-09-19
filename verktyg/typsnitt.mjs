/**
 * Hämtar och delmängdar sajtens typsnitt.
 *
 *   node verktyg/typsnitt.mjs
 *
 * TVÅ SNITT, BÅDA FRÅN GOOGLE FONTS, BÅDA SJÄLVHOSTADE.
 *
 *   Mouse Memoirs  brödtext och mindre rubriker
 *   Titan One      hero-lockupen och lagerrubriken, ingenting annat
 *
 * Fontshare-familjerna som låg här — General Sans, Cabinet Grotesk och
 * Satoshi — hämtades bara av typsnittsväxlaren. Växlaren är borta och
 * valet är gjort, så de är det också.
 *
 * SJÄLVHOSTADE, INTE LÄNKADE. Med en css2-länk kontaktar varje
 * besökares webbläsare Googles servrar och lämnar sin IP-adress där,
 * och länken är dessutom renderingsblockerande: webbläsaren måste
 * hämta CSS:en innan den vet vilken woff2 den behöver. Två
 * request-turer innan första bokstaven kan ritas, på en sajt vars
 * laddskärm ger sig efter 1,8 sekunder. Filerna ligger nu i
 * public/typsnitt/ och integritetspolicyn säger inte längre att
 * snitten hämtas från Google.
 *
 * BÅDA ÄR ENVIKTSSNITT, 400. Inga axlar att instansiera, ingen kursiv
 * att hämta. Att sajten sätter font-weight: 800 på rubriker och priser
 * är en fråga för stilmallen, inte för den här filen.
 *
 * Delmängden är svensk: latin-1-basen plus åäöÅÄÖ och de skiljetecken
 * sajten faktiskt sätter — tankstreck, typografiska citattecken,
 * multiplikationstecken för bildmått, gradtecken, akut accent (den
 * står i Qopla-adressen) och ellips. KONTROLLEN nedan bryter körningen
 * om något av dem saknas i resultatet; ett snitt som tappat ö är värre
 * än ett snitt som väger tio kilobyte mer.
 */

import { mkdir, writeFile, stat, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const korProgram = promisify(execFile);

const MAL = 'public/typsnitt';

const FAMILJER = [
  { namn: 'Mouse Memoirs', fil: 'mouse-memoirs' },
  { namn: 'Titan One', fil: 'titan-one' }
];

/** Tecknen sajten sätter. Allt annat är vikt utan nytta. */
const TECKEN = [
  'U+0020-007E', // latinsk bas
  'U+00A0', // hårt mellanslag
  'U+00B0', // grad
  'U+00B4', // akut accent — står i Qopla-adressen
  'U+00B7', // mittpunkt
  'U+00D7', // multiplikationstecken, bildmått
  'U+00C4,U+00C5,U+00D6', // ÄÅÖ
  'U+00E4,U+00E5,U+00F6', // äåö
  'U+00C9,U+00E9', // Éé
  'U+2013,U+2014', // en- och tankstreck
  'U+2018,U+2019,U+201C,U+201D', // typografiska citattecken
  'U+2026' // ellips
].join(',');

/** Tecken som MÅSTE finnas kvar efter delmängdningen. */
const KRAVDA = 'åäöÅÄÖéÉ–—…×°';

/**
 * Plockar ut LATIN-blockets woff2-adress ur Googles css2-svar.
 *
 * Google delar redan upp snittet per unicode-intervall och levererar
 * ett block per del: latin-ext, latin, ibland kyrilliska. Vi vill ha
 * latin — U+0000-00FF ligger där, alltså hela svenskan. latin-ext bär
 * bokstäver sajten aldrig sätter.
 */
function woff2Ur(css) {
  const block = css
    .split('/*')
    .find((b) => b.trim().startsWith('latin */') && b.includes('.woff2'));
  if (!block) throw new Error('hittade inget latin-block i CSS:en');
  const m = block.match(/url\((https:[^)]+\.woff2)\)/);
  if (!m) throw new Error('hittade ingen woff2-adress');
  return m[1];
}

/** Bryter körningen om delmängdningen ätit ett tecken sajten behöver. */
async function kontrollera(fil) {
  const { stdout } = await korProgram('python', [
    '-c',
    'import sys\n' +
      'from fontTools.ttLib import TTFont\n' +
      'c = TTFont(sys.argv[1]).getBestCmap()\n' +
      'print("".join(ch for ch in sys.argv[2] if ord(ch) not in c))\n',
    fil,
    KRAVDA
  ]);
  const saknas = stdout.trim();
  if (saknas) {
    throw new Error(`${fil} saknar tecken efter delmängdning: ${saknas}`);
  }
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const { namn, fil } of FAMILJER) {
    // User-Agent styr vad css2 svarar med. Utan en modern webbläsare
    // levererar Google truetype i stället för woff2.
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${namn.replace(/ /g, '+')}&display=swap`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      }
    ).then((r) => r.text());

    const adress = woff2Ur(css);
    const raBuffert = Buffer.from(
      await fetch(adress).then((r) => r.arrayBuffer())
    );

    const tillfallig = path.join(MAL, fil + '.hel.woff2');
    const mal = path.join(MAL, fil + '.woff2');
    await writeFile(tillfallig, raBuffert);

    await korProgram('pyftsubset', [
      tillfallig,
      `--unicodes=${TECKEN}`,
      '--layout-features=kern,liga,calt,tnum',
      '--flavor=woff2',
      '--no-hinting',
      `--output-file=${mal}`
    ]);

    await kontrollera(mal);

    const fore = (await stat(tillfallig)).size;
    const efter = (await stat(mal)).size;
    await unlink(tillfallig);

    rader.push([
      fil,
      `${(fore / 1024).toFixed(0)} kB`,
      `${(efter / 1024).toFixed(0)} kB`,
      `−${Math.round((1 - efter / fore) * 100)} %`
    ]);
  }

  const bredd = [0, 1, 2, 3].map((i) =>
    Math.max(...rader.map((r) => r[i].length))
  );
  for (const r of rader) console.log(r.map((v, i) => v.padEnd(bredd[i])).join('  '));

  const summa = rader.reduce((s, r) => s + parseFloat(r[2]), 0);
  console.log(`\n${rader.length} snitt, ${summa.toFixed(0)} kB totalt`);
  console.log(`alla ${KRAVDA.length} krävda tecken finns kvar i båda`);
}

kor();

/**
 * Hämtar och delmängdar typsnitten från Fontshare.
 *
 *   node verktyg/typsnitt.mjs
 *
 * BARA FONTSHARE. Outfit, Space Grotesk och Poppins ligger kvar hos
 * Google Fonts och hämtas av växlaren när de väljs; css2 levererar
 * redan woff2 per unicode-intervall och latin-intervallet bär åäö.
 * Fontshare har ingen motsvarighet — deras CDN serverar hela snittet
 * i en fil — så de tre hämtas hit och delmängdas här.
 *
 * ALLA TRE ÄR VARIABLA. En fil per familj täcker hela viktspannet, så
 * det behövs ingen uppsättning statiska vikter:
 *
 *   General Sans     200–700
 *   Cabinet Grotesk  100–900
 *   Satoshi          300–900
 *
 * Kursiv hämtas inte. Sajten sätter ingen kursiv text, och att ta med
 * den hade dubblat vikten för noll användning.
 *
 * Delmängden är svensk: latin-1-basen plus åäöÅÄÖ och de skiljetecken
 * sajten faktiskt sätter — tankstreck, typografiska citattecken,
 * multiplikationstecken för bildmått, gradtecken, akut accent (den
 * står i Qopla-adressen) och ellips.
 */

import { mkdir, writeFile, readFile, stat, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const korProgram = promisify(execFile);

const MAL = 'public/typsnitt';

const FAMILJER = [
  { id: 'general-sans', fil: 'general-sans' },
  { id: 'cabinet-grotesk', fil: 'cabinet-grotesk' },
  { id: 'satoshi', fil: 'satoshi' }
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

/** Plockar ut normalstilens woff2-adress ur Fontshares CSS. */
function woff2Ur(css) {
  // Första biten före @font-face är familjens kommentar och saknar
  // adress; blocket ska både ha en woff2 och sakna italic.
  const block = css
    .split('@font-face')
    .find((b) => b.includes('.woff2') && !b.includes('italic'));
  if (!block) throw new Error('hittade ingen normalstil i CSS:en');
  const m = block.match(/url\('(\/\/[^']+\.woff2)'\)/);
  if (!m) throw new Error('hittade ingen woff2-adress');
  return 'https:' + m[1];
}

async function kor() {
  await mkdir(MAL, { recursive: true });
  const rader = [];

  for (const { id, fil } of FAMILJER) {
    const css = await fetch(
      `https://api.fontshare.com/v2/css?f%5B%5D=${id}@1,2&display=swap`
    ).then((r) => r.text());

    const adress = woff2Ur(css);
    const raBuffert = Buffer.from(
      await fetch(adress).then((r) => r.arrayBuffer())
    );

    const tillfallig = path.join(MAL, fil + '.hel.woff2');
    const mal = path.join(MAL, fil + '.woff2');
    await writeFile(tillfallig, raBuffert);

    // Ingen --instance: axlarna ska vara kvar, annars låses vikten.
    await korProgram('pyftsubset', [
      tillfallig,
      `--unicodes=${TECKEN}`,
      '--layout-features=kern,liga,calt,tnum',
      '--flavor=woff2',
      '--no-hinting',
      `--output-file=${mal}`
    ]);

    const fore = (await stat(tillfallig)).size;
    const efter = (await stat(mal)).size;
    await unlink(tillfallig);

    rader.push([fil, `${(fore / 1024).toFixed(0)} kB`, `${(efter / 1024).toFixed(0)} kB`,
      `−${Math.round((1 - efter / fore) * 100)} %`]);
  }

  const bredd = [0, 1, 2, 3].map((i) =>
    Math.max(...rader.map((r) => r[i].length))
  );
  for (const r of rader) console.log(r.map((v, i) => v.padEnd(bredd[i])).join('  '));

  const summa = rader.reduce((s, r) => s + parseFloat(r[2]), 0);
  console.log(`\n${rader.length} variabla snitt, ${summa.toFixed(0)} kB totalt`);
}

kor();

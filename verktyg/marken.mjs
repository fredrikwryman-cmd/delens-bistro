/**
 * Bildpipeline för klistermärkena.
 *
 *   node verktyg/marken.mjs
 *
 * Åtta retromaskotar, ritade med halvtonsraster och en vit stanskant
 * hela vägen runt silhuetten. Källfilerna är ~1250 px kvadratiska
 * PNG med alfa och väger 1,1–2,2 MB styck.
 *
 * TVÅ SAKER STYR PIPELINEN.
 *
 * Stanskanten är motivet. Den vita ramen runt silhuetten är det som
 * gör märket till ett klistermärke i stället för en urklippt
 * illustration, så alfakanalen måste överleva hela vägen — därför
 * WebP med alfa och inte JPEG, och därför beskärs bara den genom-
 * skinliga marginalen bort, aldrig något av den vita kanten.
 *
 * Halvtonen är dyr. Rastret är högfrekvent och det är precis vad
 * bildkomprimering är sämst på. Mätt på fem märken:
 *
 *   PNG med 32-färgspalett   88 kB styck   kvantiseringen bryter
 *                                          rastret och PNG kan inte
 *                                          packa ihop det
 *   WebP ur 24-färgspalett   71 kB styck
 *   WebP 440 px q74          57 kB styck
 *   WebP 400 px q72          49 kB styck   valt
 *
 * 400 px räcker: ett märke visas som bredast runt 200 CSS-px, vilket
 * ger två gånger på telefonen där skärpan märks. Rastret tål
 * komprimering bättre än ett fotografi eftersom det redan ÄR ett
 * mönster — artefakterna gömmer sig i prickarna.
 */

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

const KALLA = 'kalla/marken';
const MAL = 'public/bilder/marken';

const MAL_BREDD = 400;
const KVALITET = 72;

/**
 * Fyra av åtta står på sidan. Bara de skrivs till public/ — resten
 * skulle följa med i bygget och ligga 155 kB döda i utdatan.
 * Källfilerna ligger kvar i kalla/marken, så att placera en till är
 * en rad här och en rad i index.html.
 *
 *   kalender    "januari 2026" är sant om rebranden, men smash står
 *               redan där, och två stora märken i samma sektion tar
 *               över den
 *   pommes      säger inget som inte redan står i texten
 *   stekspade   samma påstående som smash, svagare bild
 *   logo        STAVAR NAMNET "Delen's" MED APOSTROF. Namnformen är
 *               låst till Delens Bistro, samma sträng överallt. Får
 *               inte användas som ordmärke förrän den är ritad om.
 *               Samma fel som ligger i B1 och B2.
 */
const I_BRUK = new Set([
  'delens-klocka',
  'delens-smash',
  'delens-not',
  'delens-kock',
]);

/** Tröskeln är låg med flit. Den vita stanskanten tonar ut i en mjuk
 *  alfakant, och en hög tröskel hade ätit av den. */
const TRIM_TROSKEL = 6;

async function kor() {
  await mkdir(MAL, { recursive: true });
  const filer = (await readdir(KALLA)).filter((f) => f.endsWith('.png')).sort();
  const rader = [];
  let fore = 0;
  let efter = 0;

  for (const fil of filer) {
    // Filnamnen får bara vara ASCII. delens-nöt.png blir delens-not.webp:
    // ett ö i en URL måste procentkodas, och det överlever inte varje
    // led mellan filsystem, bygge och server. Texten om märket behåller
    // sitt ö — det är filnamnet som saneras, aldrig innehållet.
    const id = path.basename(fil, '.png').replace(/ö/g, 'o').replace(/[äå]/g, 'a');
    const kalla = path.join(KALLA, fil);
    const mal = path.join(MAL, id + '.webp');

    const kallstorlek = (await stat(kalla)).size;
    const meta = await sharp(kalla).metadata();

    if (!I_BRUK.has(id)) {
      rader.push([id, meta.width + '×' + meta.height, '—', '—', 'vilar']);
      continue;
    }

    const info = await sharp(kalla)
      .trim({ threshold: TRIM_TROSKEL })
      .resize({ width: MAL_BREDD })
      .webp({ quality: KVALITET, alphaQuality: 88, effort: 6 })
      .toFile(mal);

    const malstorlek = (await stat(mal)).size;
    fore += kallstorlek;
    efter += malstorlek;

    rader.push([
      id,
      `${meta.width}×${meta.height}`,
      `${info.width}×${info.height}`,
      `${(kallstorlek / 1024).toFixed(0)} kB`,
      `${(malstorlek / 1024).toFixed(0)} kB`,
    ]);
  }

  const bredd = [0, 1, 2, 3, 4].map((i) =>
    Math.max(...rader.map((r) => r[i].length))
  );
  for (const r of rader) {
    console.log(r.map((v, i) => v.padEnd(bredd[i])).join('  '));
  }
  console.log(
    `\n${I_BRUK.size} av ${rader.length} märken i bruk   ${(fore / 1048576).toFixed(1)} MB → ` +
      `${(efter / 1024).toFixed(0)} kB`
  );
}

kor();

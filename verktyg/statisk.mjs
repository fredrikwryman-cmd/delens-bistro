/**
 * Statisk HTML ur menu.js, vid bygget.
 *
 * Menyn, öppettiderna och kontaktuppgifterna byggdes förut i
 * webbläsaren. Med JavaScript avstängt stod sidan då utan meny, utan
 * tider och med href="#" på telefon, mejl, karta och Qopla — just det
 * man kommer till en restaurangsajt för. Nu skrivs allt det in i
 * HTML:en av Vite, och main.js lägger bara på beteendet.
 *
 * menu.js är fortfarande den enda källan. HTML-filerna bär platshållare:
 *
 *   {{namn}}         ett värde, i text eller attribut (se VARDEN)
 *   <!--bygg:namn--> ett färdigt block (se BLOCK)
 *
 * En platshållare som inte finns i listorna fäller bygget. Hellre ett
 * stopp här än en sida som visar {{telefon}} för besökaren.
 */

import { kategorier, oppettider, kontakt, stangerKort, stangning } from '../src/data/menu.js';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const VARDEN = {
  adress: kontakt.adress,
  telefon: kontakt.telefon,
  telLank: kontakt.telefonLank,
  epost: kontakt.epost,
  epostLank: 'mailto:' + kontakt.epost,
  // Både textlänken och kartbilden pekar på samma sökning i Google Maps.
  karta: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(kontakt.adress),
  facebook: kontakt.facebook,
  instagram: kontakt.instagram,
  bestall: kontakt.bestall,
  stangning: 'Stänger ' + stangning
};

/** Signaturburgarna delar filer med dragspelet, resten är egna. */
const bildvag = (id) =>
  id.startsWith('C') ? `/bilder/signatur/${id}.webp` : `/bilder/meny/${id}.webp`;

function menyFlikar() {
  return kategorier
    .map(
      (k, i) => `
      <button class="flik" role="tab" id="flik-${k.id}"
              aria-controls="panel-${k.id}"
              aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
        ${esc(k.namn)}
      </button>`
    )
    .join('');
}

function menyPaneler() {
  return kategorier
    .map((k, ki) => {
      // Första rätten med bild står öppen när kategorin visas.
      const forstaMedBild = k.ratter.findIndex((r) => r.bild);

      const rader = k.ratter
        .map((r, ri) => {
          /* PRISET OCH MARKÖREN LIGGER I EN EGEN ENHET, och det är inte
             en extra div för sakens skull. Raden är en flexrad som
             får brytas när namnet och priset inte får plats bredvid
             varandra — och bryts de var för sig hamnar bara markören
             på nästa rad, en ensam prick under priset. I en enhet
             flyttar de tillsammans. */
          const pris = `<span class="ratt__pris">${esc(r.pris)} kr</span>`;
          const slut = (markor = '') =>
            `<span class="ratt__slut">${pris}${markor}</span>`;
          const namn = `<span class="ratt__namn">${esc(r.namn)}${
            r.signatur ? '<span class="ratt__signatur">signatur</span>' : ''
          }</span>`;
          const innehall = r.innehall
            ? `<span class="ratt__innehall">${esc(r.innehall)}</span>`
            : '';

          if (!r.bild) {
            return `
            <li class="ratt">
              <span class="ratt__rad">
                ${namn}<span class="ratt__prickar" aria-hidden="true"></span>${slut()}
              </span>
              ${innehall}
            </li>`;
          }

          const luckaId = `lucka-${k.id}-${ri}`;
          const oppen = ri === forstaMedBild;
          /* De öppna raderna får src direkt, som de fick av main.js
             förut vid start. Övriga bär data-kalla och hämtas först
             när raden öppnas. */
          const kalla = oppen ? 'src' : 'data-kalla';
          const media = r.bild.startsWith('C')
            ? `<img class="lucka__bild" ${kalla}="${bildvag(r.bild)}" alt="${esc(r.namn)}"
                    width="1000" height="1339" decoding="async" />`
            : `<span class="ph" data-id="${r.bild}" data-spec="1000 × 1339"></span>`;

          return `
            <li class="ratt ratt--bild" data-oppen="${oppen}">
              <button class="ratt__knapp" type="button"
                      aria-expanded="${oppen}" aria-controls="${luckaId}">
                <span class="ratt__rad">
                  ${namn}<span class="ratt__prickar" aria-hidden="true"></span>${slut(
                    '<span class="ratt__markor" aria-hidden="true"></span>'
                  )}
                </span>
                ${innehall}
              </button>
              <div class="ratt__lucka" id="${luckaId}">
                <div class="lucka__inre">
                  <span class="lucka__media">${media}</span>
                </div>
              </div>
            </li>`;
        })
        .join('');

      /* Kategorirubriken är dold med JS: där bär fliken namnet. Utan
         JS finns inga flikar att klicka på, alla paneler står under
         varandra och rubriken tas fram av <noscript> i index.html. */
      return `
      <div class="meny__panel" role="tabpanel" id="panel-${k.id}"
           aria-labelledby="flik-${k.id}" ${ki === 0 ? '' : 'hidden'}>
        <h3 class="meny__kategori" hidden>${esc(k.namn)}</h3>
        ${k.underrubrik ? `<p class="meny__underrubrik">${esc(k.underrubrik)}</p>` : ''}
        <ul class="ratter">${rader}</ul>
      </div>`;
    })
    .join('');
}

function hittaTider() {
  // Måndag först i listan, söndag sist. data-dag är index i
  // oppettider (0 = söndag); main.js markerar dagens rad med den.
  return [1, 2, 3, 4, 5, 6, 0]
    .map((i) => {
      const d = oppettider[i];
      return `<li data-dag="${i}" data-idag="false"><span>${d.dag}</span><span>${d.fran} till ${stangerKort}</span></li>`;
    })
    .join('');
}

const BLOCK = {
  'meny-flikar': menyFlikar,
  'meny-paneler': menyPaneler,
  'hitta-tider': hittaTider
};

export function ersatt(html) {
  const ut = html
    .replace(/<!--bygg:([\w-]+)-->/g, (hel, namn) => {
      if (!BLOCK[namn]) throw new Error(`Okänt block i HTML: ${hel}`);
      return BLOCK[namn]();
    })
    .replace(/\{\{(\w+)\}\}/g, (hel, namn) => {
      if (!(namn in VARDEN)) throw new Error(`Okänd platshållare i HTML: ${hel}`);
      return esc(VARDEN[namn]);
    });
  return ut;
}

/** Vite-insticket. 'pre' så att Vite ser de färdiga länkarna. */
export function statiskHtml() {
  return {
    name: 'delens-statisk-html',
    transformIndexHtml: { order: 'pre', handler: ersatt }
  };
}

/**
 * Delens Bistro — struktur.
 *
 * Ett enda requestAnimationFrame-varv driver all scrollstyrd rörelse.
 * Bara transform och opacity animeras.
 */

import Lenis from 'lenis';
import { animate, stagger } from 'animejs';
import { kategorier, signaturer, oppettider, kontakt } from './data/menu.js';

const reducerad = matchMedia('(prefers-reduced-motion: reduce)');
const pekareMedHover = matchMedia('(hover: hover) and (pointer: fine)');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ═══ 0 · LADDSKÄRM ══════════════════════════════════════════════
   Ger sig efter 1,8 s oavsett. Hoppas över vid återbesök i samma
   session och vid reducerad rörelse. Se PLAN.md avsnitt 9.        */

const LADD_TAK_MS = 1800;

/* SLUTSPELET: vad som fortfarande pågår efter att SISTA etappen
   startat. Lagret faller i 520 ms, och stapelns stuk sätts igång vid
   nedslaget (300 ms in i fallet) och håller på i 340 — alltså 640 ms
   från sista etappen till att burgaren står stilla.

   Utan det här talet delades taket på antalet etapper: fem steg om
   360 ms, sista etappen vid 1440, och lagret landade 1960 — 160 ms
   EFTER att skärmen börjat tona bort, med stuken avklippt vid 2080.
   Med ritade klossar märktes det inte. Med en riktig överbulle är
   just den landningen hela poängen: det är den som gör "Serverar!"
   sant. Etapperna får därför dela på taket MINUS slutspelet. */
const LADD_SLUTSPEL_MS = 640;

/* Varje etapp släpper ned DET LAGER DEN NAMNGER. Ordningen i
   markupen följer den här listan, inte stapelordningen: plåten värms
   och underbullen landar, köttet smashas och pucken landar. Med
   ritade former spelade det ingen roll vilken kloss som kom när —
   med fotografier läser en överbulle som dyker upp vid "värmer
   plåten" som fel bild i fel ruta.

   Att salladen kommer efter osten och ändå hamnar under den sköts av
   --z i lagerregistret, inte av dokumentordningen. */
const laddEtapper = [
  'Värmer plåten …', // underbulle
  'Smashar köttet …', // köttpuck
  'Smälter cheddarn …', // ost
  'Lägger salladen …', // sallad
  'Serverar!' // överbulle
];

function startaLaddskarm() {
  const el = $('#loader');
  const text = $('#loader-text');
  const fyll = $('#loader-fill');
  const delar = $$('.loader__part');

  /* Ingen laddskärm i markupen: sidan ska visas, inte vänta på ett
     löfte som aldrig löses. */
  if (!el) return Promise.resolve();

  /* Sessionsminnet kan KASTA, inte bara sakna värde — privat läge och
     blockerade kakor ger SecurityError på själva åtkomsten. Förut låg
     läsningen bar i uttrycket nedan, så ett kast här tog med sig hela
     startaLaddskarm() och därmed avslöjningen: sidan blev stående
     bakom en laddskärm som ingen längre räknade ned. Går minnet inte
     att läsa visas skärmen, vilket är det ofarliga av de två. */
  const sedd = () => {
    try {
      return sessionStorage.getItem('delens-sedd') === '1';
    } catch {
      return false;
    }
  };

  const doljSkarmen = () => {
    el.setAttribute('data-klar', 'true');
    el.setAttribute('aria-hidden', 'true');
  };

  if (reducerad.matches || sedd()) {
    doljSkarmen();
    return Promise.resolve();
  }

  return new Promise((klar) => {
    const start = performance.now();
    const steg =
      (LADD_TAK_MS - LADD_SLUTSPEL_MS) / (laddEtapper.length - 1);

    /* ── TAKET ──────────────────────────────────────────────────────
       Ett tak som inte håller när något går fel är inget tak.

       Nedräkningen låg förut ENBART i rAF-slingan: bredden räknades
       där, och skärmen släpptes i samma gren som satte bredden till
       100. Men rAF är ingen klocka. Webbläsaren pausar den helt medan
       dokumentet är dolt — bakgrundsflik, minimerat fönster, en flik
       som återställs efter en omstart utan att få fokus. Då kördes
       tick aldrig en enda gång: stapeln stod på noll, texten stod
       kvar på markupens "Värmer plåten …", löftet löstes aldrig, och
       avslöjningen startade aldrig. Sidan gick inte att öppna, och en
       hård omladdning i samma dolda flik gav samma sak.

       Taket går därför på setTimeout, som tickar vidare också i en
       dold flik, och släppet är skilt från ritandet. rAF får nu göra
       en enda sak: måla stapeln medan någon tittar på den. */

    let slappt = false;
    let tak;

    const slapp = () => {
      if (slappt) return; // rAF och taket kan båda hinna hit
      slappt = true;
      clearTimeout(tak);
      /* Varje steg står för sig. Ett kast i ett får inte hindra
         klar() — det är det löftet resten av sidan hänger på. */
      if (fyll) fyll.style.width = '100%';
      doljSkarmen();
      try {
        sessionStorage.setItem('delens-sedd', '1');
      } catch {
        /* Skrivningen är en bekvämlighet: utan den visas skärmen igen
           vid nästa sidbyte. Det är inte värt att fastna för. */
      }
      klar();
    };

    tak = setTimeout(slapp, LADD_TAK_MS);

    /* Lagret släpps när DESS EGEN bild går att rita, inte när
       klockan säger till. Delarna var ritade former förut och fanns i
       samma ögonblick som markupen; nu är de fem filer. En del som
       får data-syns innan bilden är avkodad faller som en tom ruta —
       och just den här skärmen visas medan allt annat laddar, alltså
       precis när det är som mest sannolikt.

       decode() på en redan hämtad bild löser sig i en mikrouppgift,
       så i praktiken kostar det ingenting. Misslyckas den släpps
       lagret ändå: en trasig bild är illa, ett lager som aldrig
       kommer är värre — då står burgaren halvbyggd när skärmen
       släpper. Texten och taket rör sig aldrig, de går på klockan. */
    const slappLager = (i) => {
      const d = delar[i];
      if (!d) return;
      const satt = () => d.setAttribute('data-syns', 'true');
      if (d.decode) d.decode().catch(() => {}).then(satt);
      else satt();
    };

    laddEtapper.forEach((rad, i) => {
      setTimeout(() => {
        if (slappt) return; // taket hann före: skärmen är redan borta
        if (text) text.textContent = rad;
        slappLager(i);
        // Sista lagret landar: hela stapeln stukas och reser sig.
        if (i === laddEtapper.length - 1) setTimeout(stukaStapeln, 300);
      }, steg * i);
    });

    /* Stapeln målas så länge någon kan se den. Slingan äger inte
       längre släppet, så att den pausas i en dold flik är harmlöst —
       taket ovan räknar ned ändå. */
    const tick = () => {
      if (slappt) return;
      const gatt = performance.now() - start;
      if (fyll) {
        fyll.style.width = Math.min(100, (gatt / LADD_TAK_MS) * 100) + '%';
      }
      if (gatt < LADD_TAK_MS) requestAnimationFrame(tick);
      else slapp();
    };
    requestAnimationFrame(tick);
  });
}

/* ═══ ÖPPETTIDER ═════════════════════════════════════════════════ */

const tillMinuter = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function oppetLage(nu = new Date()) {
  const idag = oppettider[nu.getDay()];
  const minuter = nu.getHours() * 60 + nu.getMinutes();
  const fran = tillMinuter(idag.fran);
  const till = tillMinuter(idag.till);
  const oppet = minuter >= fran && minuter < till;

  if (oppet) return { oppet, etikett: `Öppet till ${idag.till}`, idag };

  if (minuter < fran) return { oppet, etikett: `Öppnar ${idag.fran}`, idag };

  const imorgon = oppettider[(nu.getDay() + 1) % 7];
  return { oppet, etikett: `Stängt — öppnar ${imorgon.fran} i morgon`, idag };
}

function fyllStatus() {
  const { oppet, etikett } = oppetLage();

  $('#status-dot').setAttribute('data-oppet', String(oppet));
  $('#status-label').textContent = etikett;
  $('#orderbar-status').textContent = etikett;

  const tel = $('#status-tel');
  tel.href = kontakt.telefonLank;
  tel.textContent = kontakt.telefon;
}

function fyllTider(el) {
  const idag = new Date().getDay();
  // Måndag först i listan, söndag sist.
  const ordning = [1, 2, 3, 4, 5, 6, 0];
  el.innerHTML = ordning
    .map((i) => {
      const d = oppettider[i];
      return `<li data-idag="${i === idag}"><span>${d.dag}</span><span>${d.fran}–${d.till}</span></li>`;
    })
    .join('');
}

/* ═══ KONTAKTUPPGIFTER ═══════════════════════════════════════════ */

function fyllKontakt() {
  const kartlank =
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(kontakt.adress);

  const satt = (sel, fn) => {
    const el = $(sel);
    if (el) fn(el);
  };

  satt('#hitta-adress', (el) => (el.textContent = kontakt.adress));
  satt('#foot-adress', (el) => (el.textContent = kontakt.adress));
  // Både textlänken och kartbilden pekar på samma sökning i Google Maps.
  for (const sel of ['#hitta-karta', '#hitta-kartlank']) {
    satt(sel, (el) => (el.href = kartlank));
  }

  for (const sel of ['#hitta-tel', '#foot-tel']) {
    satt(sel, (el) => {
      el.href = kontakt.telefonLank;
      el.textContent = kontakt.telefon;
    });
  }
  for (const sel of ['#hitta-epost', '#foot-epost']) {
    satt(sel, (el) => {
      el.href = 'mailto:' + kontakt.epost;
      el.textContent = kontakt.epost;
    });
  }
  for (const sel of ['#hitta-fb', '#foot-fb']) {
    satt(sel, (el) => (el.href = kontakt.facebook));
  }
  satt('#foot-ig', (el) => (el.href = kontakt.instagram));
  for (const sel of ['#bestall-lank', '#orderbar-lank']) {
    satt(sel, (el) => (el.href = kontakt.bestall));
  }

  // Bara en gång. Listan stod ordagrant lika i foten också.
  fyllTider($('#hitta-tider'));
}

/* ═══ 5 · SIGNATURBURGARNA — DRAGSPELSGALLERI ════════════════════
   Portat från React Bits AccordionGallery. Mekaniken är densamma,
   implementationen är egen: inget React, ingen GSAP.

   Förlagans referensvärden som behållits:
     expandRatio 0.52   standardöppet kort 3 (index 2)
     parallax 0.5       tilt 8 grader       mediafaktor 1.22

   Kärnan: korten är flex 1 1 0 och det aktiva får
   flex-grow = r*(n-1)/(1-r), vilket ger det exakt andelen r av
   bredden. Mediarutan inuti är bredare än kortet, så motivet beskärs
   i stället för att klämmas ihop när kortet krymper.

   Rörelsen ligger i CSS-övergångar. JS gör tre saker: bygger
   markupen, räknar ut flex-grow och mediarutans bredd, och håller
   reda på vilket kort som är aktivt.                                */

const DRAGSPEL = {
  expandRatio: 0.52,
  standardIndex: 2,
  parallax: 0.5,
  // Förlagan har 1.22. Nedskruvad eftersom mediarutan annars blir
  // bredare än den behöver och tvingar fram mer vertikal beskärning
  // av porträttbilderna. 1.08 räcker för att inaktiva kort ska beskära
  // i stället för att klämma, och för parallaxen.
  mediafaktor: 1.08,
  gap: 10
};

/**
 * Fingerläge. Måste vara ordagrant samma villkor som media-frågan i
 * style.css, annars säger CSS och JS olika saker om samma vy: lodrätt
 * dragspel som ändå styrs av hover, eller hjälptext som talar om att
 * peka på en skärm utan pekare.
 */
const fingerlage = matchMedia('(hover: none), (pointer: coarse), (max-width: 620px)');

function byggSignaturer() {
  const galleri = $('#signatur-galleri');
  if (!galleri) return;

  galleri.innerHTML = signaturer
    .map(
      (b, i) => `
      <div class="dragspel__kort" role="listitem" tabindex="0"
           data-index="${i}" data-aktiv="false"
           aria-label="${b.namn}, ${b.pris} kr">
        <span class="dragspel__ram">
          <span class="dragspel__media">
            <img src="/bilder/signatur/${b.id}.webp" alt="${b.namn}"
                 width="1000" height="1339" loading="lazy" decoding="async" />
          </span>
          <span class="dragspel__sloja" aria-hidden="true"></span>
        </span>
        <span class="dragspel__etikett" aria-hidden="true">
          <span class="dragspel__strec"></span>
          <span class="dragspel__text">
            <b class="dragspel__namn">${b.namn}</b>
            <span class="dragspel__pris">${b.pris} kr</span>
            <span class="dragspel__pitch">${b.pitch}</span>
          </span>
        </span>
      </div>`
    )
    .join('');

  const kort = $$('.dragspel__kort', galleri);
  const antal = kort.length;
  let aktiv = Math.min(Math.max(DRAGSPEL.standardIndex, 0), antal - 1);
  let mediabredd = 480;

  const r = Math.min(Math.max(DRAGSPEL.expandRatio, 0.2), 0.9);
  galleri.style.setProperty(
    '--vaxt',
    String(antal > 1 ? (r * (antal - 1)) / (1 - r) : 1)
  );

  const rita = () => {
    kort.forEach((k, i) => {
      const arAktiv = i === aktiv;
      k.dataset.aktiv = String(arAktiv);
      k.setAttribute('aria-current', arAktiv ? 'true' : 'false');
      // Korten före det aktiva lutar åt ena hållet, de efter åt andra.
      k.style.setProperty('--vrid', arAktiv ? '0' : i < aktiv ? '1' : '-1');
      const drift = Math.max(-1.5, Math.min(1.5, aktiv - i));
      const skift = arAktiv ? 0 : drift * DRAGSPEL.parallax * mediabredd * 0.06;
      k.style.setProperty('--skift', skift.toFixed(1) + 'px');
    });
  };

  const satt = (i) => {
    const n = (i + antal) % antal;
    if (n === aktiv) return;
    aktiv = n;
    rita();
  };

  const mat = () => {
    const total = galleri.getBoundingClientRect().width;
    const brukbar = Math.max(total - DRAGSPEL.gap * (antal - 1), 120);
    mediabredd = Math.max(140, brukbar * r * DRAGSPEL.mediafaktor);
    galleri.style.setProperty('--mediabredd', Math.round(mediabredd) + 'px');
    rita();
  };

  kort.forEach((k, i) => {
    k.addEventListener('click', () => satt(i));
    k.addEventListener('focus', () => satt(i));
    k.addEventListener('mouseenter', () => {
      // I fingerläge är dragspelet lodrätt och styrs av tryck.
      if (!fingerlage.matches) satt(i);
    });
    k.addEventListener('keydown', (e) => {
      const framat = e.key === 'ArrowRight' || e.key === 'ArrowDown';
      const bakat = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
      if (!framat && !bakat) return;
      e.preventDefault();
      const n = (i + (framat ? 1 : -1) + antal) % antal;
      satt(n);
      kort[n].focus();
    });
  });

  new ResizeObserver(mat).observe(galleri);
  mat();

  const hjalp = $('#dragspel-hjalp');
  const sattHjalp = () => {
    if (!hjalp) return;
    hjalp.textContent = fingerlage.matches
      ? 'Tryck på ett kort för att fälla ut det'
      : 'Peka på ett kort för att fälla ut det';
  };
  sattHjalp();
  fingerlage.addEventListener('change', sattHjalp);
}

/* ═══ 6 · MENYN ══════════════════════════════════════════════════
   Listan är en lista. Rätter som har ett foto får en markör och
   visar bilden under raden. Exakt ett foto står öppet per kategori,
   precis som dragspelets kort visar exakt ett motiv, och första
   rätten med bild står öppen från start.

   Med mus räcker det att peka, efter en fördröjning på 180 ms. Med
   finger trycker man. Se kommentaren vid pointermove nedan.

   Samma rörelselag som dragspelet: 220 ms och samma kurva. Höjden
   animeras med grid-template-rows 0fr → 1fr, vilket går att övergå
   till skillnad från height: auto. Bilden veckas fram genom att
   behållaren växer och beskär — den skalas inte.

   Bilderna hämtas först när raden öppnas. 33 rätter har foto; laddade
   de alla på en gång vore menyn tyngre än resten av sajten.         */

/** Signaturburgarna delar filer med dragspelet, resten är egna. */
const bildvag = (id) =>
  id.startsWith('C') ? `/bilder/signatur/${id}.webp` : `/bilder/meny/${id}.webp`;

function byggMeny() {
  const flikar = $('#meny-flikar');
  const paneler = $('#meny-paneler');

  flikar.innerHTML = kategorier
    .map(
      (k, i) => `
      <button class="flik" role="tab" id="flik-${k.id}"
              aria-controls="panel-${k.id}"
              aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">
        ${k.namn}
      </button>`
    )
    .join('');

  paneler.innerHTML = kategorier
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
          const pris = `<span class="ratt__pris">${r.pris} kr</span>`;
          const slut = (markor = '') =>
            `<span class="ratt__slut">${pris}${markor}</span>`;
          const namn = `<span class="ratt__namn">${r.namn}${
            r.signatur ? '<span class="ratt__signatur">signatur</span>' : ''
          }</span>`;
          const innehall = r.innehall
            ? `<span class="ratt__innehall">${r.innehall}</span>`
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
          const media = r.bild.startsWith('C')
            ? `<img class="lucka__bild" data-kalla="${bildvag(r.bild)}" alt="${r.namn}"
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

      return `
      <div class="meny__panel" role="tabpanel" id="panel-${k.id}"
           aria-labelledby="flik-${k.id}" ${ki === 0 ? '' : 'hidden'}>
        ${k.underrubrik ? `<p class="meny__underrubrik">${k.underrubrik}</p>` : ''}
        <ul class="ratter">${rader}</ul>
      </div>`;
    })
    .join('');

  /* ── Utfällningen ───────────────────────────────────────────── */

  const ladda = (li) => {
    const im = li.querySelector('.lucka__bild[data-kalla]');
    if (!im) return;
    im.src = im.dataset.kalla;
    delete im.dataset.kalla;
  };

  /* Raden stängs aldrig — en kategori visar alltid exakt ett foto,
     och att peka på en rad flyttar bara vilket. Ett läge där ingen
     bild syns fanns det inget skäl att kunna hamna i. */
  const oppna = (li) => {
    if (!li || li.dataset.oppen === 'true') return;
    for (const annan of $$('.ratt--bild[data-oppen="true"]', li.closest('.ratter'))) {
      annan.dataset.oppen = 'false';
      annan.querySelector('.ratt__knapp').setAttribute('aria-expanded', 'false');
    }
    li.dataset.oppen = 'true';
    li.querySelector('.ratt__knapp').setAttribute('aria-expanded', 'true');
    ladda(li);
  };

  // Tryck öppnar på alla enheter. På pekskärm är det hela styrningen.
  paneler.addEventListener('click', (e) => {
    const knapp = e.target.closest('.ratt__knapp');
    if (knapp) oppna(knapp.closest('.ratt--bild'));
  });

  // Tangentbordet får ingen fördröjning. Den finns för att skydda mot
  // en pekare som råkar passera; ett fokus är alltid avsiktligt.
  paneler.addEventListener('focusin', (e) => {
    const knapp = e.target.closest?.('.ratt__knapp');
    if (knapp) oppna(knapp.closest('.ratt--bild'));
  });

  /* Med mus styrs menyn genom att peka, inte genom att klicka. Ett
     klick för att se ett foto är ett steg för mycket när man bara
     skummar en lista.

     Fördröjningen är nödvändig, inte en finess. Utan den vecklar
     varje rad man drar pekaren förbi ut sig, och listan hoppar. 180
     ms är längre än en snabb passage över en rad och kortare än en
     paus — raden öppnar sig när musen stannar.

     Den ligger på pointermove och inte på pointerover med flit. När
     en rad öppnas stängs en annan, och stod den ovanför glider hela
     listan uppåt under en stillastående pekare. Det utlöser
     pointerover på nästa rad, som öppnar sig, som flyttar listan
     igen — en kedja som springer nedåt av sig själv. pointermove
     utlöses inte av att innehåll flyttar sig, bara av att handen
     gör det. */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const DROJ = 180;
    let timer = 0;
    let senaste = null;

    paneler.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const li = e.target.closest?.('.ratt--bild');
      if (li === senaste) return;
      senaste = li;
      clearTimeout(timer);
      if (!li || li.dataset.oppen === 'true') return;
      timer = setTimeout(() => oppna(li), DROJ);
    });

    paneler.addEventListener('pointerleave', () => {
      clearTimeout(timer);
      senaste = null;
    });
  }

  // De rader som står öppna från start behöver sin bild direkt.
  $$('.ratt--bild[data-oppen="true"]', paneler).forEach(ladda);

  /* ── Flikarna ───────────────────────────────────────────────── */

  const knappar = $$('.flik', flikar);

  const visa = (id) => {
    knappar.forEach((b) => {
      const vald = b.id === `flik-${id}`;
      b.setAttribute('aria-selected', String(vald));
      b.tabIndex = vald ? 0 : -1;
      if (vald) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    $$('.meny__panel', paneler).forEach((p) => {
      p.hidden = p.id !== `panel-${id}`;
    });
    $$(`#panel-${id} .ratt--bild[data-oppen="true"]`, paneler).forEach(ladda);
  };

  flikar.addEventListener('click', (e) => {
    const b = e.target.closest('.flik');
    if (b) visa(b.id.replace('flik-', ''));
  });

  // Piltangenter mellan flikar.
  flikar.addEventListener('keydown', (e) => {
    const i = knappar.indexOf(document.activeElement);
    if (i < 0) return;
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % knappar.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + knappar.length) % knappar.length;
    if (e.key === 'Home') n = 0;
    if (e.key === 'End') n = knappar.length - 1;
    if (n === null) return;
    e.preventDefault();
    knappar[n].focus();
    visa(knappar[n].id.replace('flik-', ''));
  });
}

/* ═══ ORD-FÖR-ORD-AVSLÖJNING ═════════════════════════════════════
   Utgångsläget sätts här, inte i CSS — utan JS syns all text.     */

function riggaAvslojning() {
  const mal = $$('[data-reveal]');
  if (!mal.length) return;

  /**
   * Delar upp i ord, men bara i noder som saknar elementbarn. Rubriker
   * som är satta i flera rader behåller sin radstruktur — annars slås
   * raderna ihop till en enda klump när innerHTML skrivs om.
   * Ordningen bevaras, så förskjutningen löper obruten över raderna.
   */
  const delaUpp = (el) => {
    const barn = [...el.children];
    if (barn.length) {
      barn.forEach(delaUpp);
      return;
    }
    const ord = el.textContent.trim().split(/\s+/);
    el.innerHTML = ord.map((o) => `<span class="ord">${o}</span>`).join(' ');
  };

  mal.forEach(delaUpp);

  const io = new IntersectionObserver(
    (poster) => {
      for (const p of poster) {
        if (!p.isIntersecting) continue;
        io.unobserve(p.target);
        const ord = $$('.ord', p.target);

        if (reducerad.matches) {
          animate(ord, { opacity: [0, 1], duration: 260, delay: stagger(30) });
        } else {
          animate(ord, {
            opacity: [0, 1],
            y: [{ from: '0.5em' }],
            rotate: [{ from: -4 }],
            duration: 620,
            delay: stagger(55),
            ease: 'out(3)'
          });
        }
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  );

  mal.forEach((el) => {
    $$('.ord', el).forEach((o) => (o.style.opacity = '0'));
    io.observe(el);
  });
}

/* ═══ KLISTERMÄRKENA ═════════════════════════════════════════════
   Wobblet är dekor och får bara kosta något när det syns.          */

/* ═══ FASTA FÄLTET ═══════════════════════════════════════════════ */

function riggaOrderbar() {
  const bar = $('#orderbar');
  const mal = $('#bestall');
  if (!bar || !mal) return;
  new IntersectionObserver(
    ([post]) => bar.setAttribute('data-undan', String(post.isIntersecting)),
    // Först när en rejäl del av sektionen syns — annars blinkar fältet
    // förbi vid varje passage.
    { threshold: 0.35 }
  ).observe(mal);
}

/* Utgångsläget sätts härifrån och inte i CSS. Ett märke som ligger på
   opacity 0 i stilmallen är osynligt för den som kör utan JS, och det
   är ett fel som ingen skanner hittar. Det måste stå före första
   målningen — annars syns märket, släcks och tänds igen. */
function forberedStickers() {
  for (const m of $$('.sticker')) m.setAttribute('data-ankomst', '');
}

function riggaStickers() {
  // Varje MÄRKE observeras, inte sektionen det ligger i. Sektionerna är
  // 1800 till 2900 px höga, så en sektion räknas som synlig långt efter
  // att märket rullat ur bild.
  const marken = $$('.sticker');
  if (!marken.length) return;

  // Ankomsten sker EN gång. Den gamla vaggningen gick i all evighet;
  // på en 200 px illustration är det en sak som aldrig slutar röra sig
  // mitt i läsningen. Märket sätts dit och står sedan still, vilket
  // också är sannare mot vad ett klistermärke är.
  const io = new IntersectionObserver(
    (poster) => {
      for (const p of poster) {
        if (!p.isIntersecting) continue;
        p.target.setAttribute('data-synlig', 'true');
        // Märken som scrollen inte kan rulla ned trycks ned här i
        // stället; riggningen har märkt dem med data-satt. CSS:en
        // håller fördröjningen så att landningen hinner läsas först.
        //
        // Nedtryckningen väntar en bildruta: övergången för --skal
        // armas av data-satt, och sätts värdet i samma omgång som
        // attributet finns inget gammalt läge att gå ifrån.
        if (p.target.getAttribute('data-satt') === 'true') {
          const mal = p.target;
          requestAnimationFrame(() => mal.style.setProperty('--skal', '0'));
        }
        io.unobserve(p.target);
      }
    },
    // Märket ska vara nere i vyn innan det sätts dit, inte klippa in
    // i samma bildruta som dess första pixel.
    { threshold: 0.35 }
  );
  marken.forEach((m) => io.observe(m));
}

/* ═══════════════════════════════════════════════════════════════
   CRAV:S RÖRELSE
   Inventerad på cravburgers.shop, byggd om i egen kod. Stilarna
   ligger i style.css under samma rubriker.

   ALLT SCROLLSTYRT LIGGER I DET BEFINTLIGA VARVET. Sidan har ett
   requestAnimationFrame-varv och ska fortsätta ha ett. Varje ny
   effekt som behöver en bildruta registrerar sig i varvSteg nedan
   i stället för att starta ett eget varv.
   ═══════════════════════════════════════════════════════════════ */

/** Funktioner som körs en gång per bildruta, av riggaScroll. */
const varvSteg = [];

/** Är fliken dold? Då ska ingenting röra sig. */
let flikenDold = document.visibilityState === 'hidden';
document.addEventListener('visibilitychange', () => {
  flikenDold = document.visibilityState === 'hidden';
});

/** Exponentiell utjämning som är oberoende av bildrutetakt.
 *  halveringstid = tiden det tar för avståndet att halveras. */
const mjuka = (nu, mal, halveringstid, dt) =>
  mal + (nu - mal) * Math.pow(0.5, dt / halveringstid);

/* ═══ 1 · HJÄLTEBURGAREN ═════════════════════════════════════════
   Entré först, flyt sedan. Samma element kan inte bära båda: entrén
   skalar och vrider, flytet förskjuter, och en transform skriver
   över en annan. Entrén ligger därför på .hero__burger och flytet
   på bilden inuti.

   Flytet startar när entrén landat och inte tidigare, annars slåss
   de om samma yta under inflygningens sista halvsekund.            */

function riggaHeroburgare() {
  const burgare = $('.hero__burger');
  if (!burgare) return;

  burgare.setAttribute('data-entre', 'vantar');

  return () => {
    // Två bildrutor så att utgångsläget hinner målas innan övergången.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        burgare.setAttribute('data-entre', 'gar');
        if (reducerad.matches) return;
        setTimeout(() => burgare.setAttribute('data-flyt', 'true'), 1500);
      })
    );

    // Löpande rörelse utanför vyn är bortkastad.
    new IntersectionObserver(
      ([post]) => {
        burgare.style.setProperty(
          'animation-play-state',
          post.isIntersecting ? 'running' : 'paused'
        );
        const bild = burgare.querySelector('picture');
        if (bild) {
          bild.style.animationPlayState = post.isIntersecting
            ? 'running'
            : 'paused';
        }
      },
      { threshold: 0 }
    ).observe(burgare);
  };
}

/* ═══ 2 · GELÉVÅGEN ══════════════════════════════════════════════
   Vågavdelarna är statiska SVG-banor. Nu lever kontrollpunkterna:
   tre oscillatorer med olika period — 7 s, 11 s och 9,5 s —
   förskjutna 0, 2,1 och 4,3 s. Olika perioder är hela poängen; samma
   period på alla tre ger en våg som guppar i takt och läser som en
   flagga, inte som gelé.

   Banans d skrivs om per bildruta. Det är den enda egenskapen här
   som inte går på GPU:n, och det finns ingen transform-motsvarighet
   till att flytta en kontrollpunkt. Kostnaden hålls nere av att
   bara vågar i vyn räknas om, och av att d bara skrivs när värdet
   faktiskt ändrats.

   Ovanpå det ligger scrubben: vågen tänjs mot 1,5 på desktop och
   1,2 på mobil när sektionen närmar sig.                          */

const VAG = {
  /* PERIODERNA ÄR SEXDUBBLADE mot förlagans 1, 2 och 1,8 sekunder.
     Förlagan är en knapp som svarar på en klickning — där är ett
     sekundlångt varv rätt. Här är vågen en fast del av sidan som
     syns i tiotals sekunder medan man läser, och i den rollen läste
     samma takt som nervös flimmer: en punkt som vänder varje halvsekund
     kastar upp och ned i stället för att svalla.

     Sju, elva och tio sekunder ger en topp som tar flera sekunder på
     sig att resa sig. Olika perioder är fortfarande hela poängen —
     samma period på alla tre ger en våg som guppar i takt och läser
     som en flagga, inte som gelé. Förskjutningarna är skalade i samma
     omfång, annars hade de tre oscillatorerna startat nästan
     samtidigt i förhållande till sina nya varv. */
  perioder: [7000, 11000, 9500],
  forskjutning: [0, 2100, 4300],
  utslag: 9,
  hojd: 90, // viewBoxens höjd
  skalaMax: () => (window.innerWidth < 720 ? 1.2 : 1.5)
};

function riggaVagor() {
  const vagor = $$('.wave');
  if (!vagor.length) return;

  const spar = vagor.map((svg) => {
    const kropp = svg.querySelector('.wave__body');
    const kant = svg.querySelector('.wave__edge');
    // Kantens bana är kroppens utan det avslutande L-hörnet.
    const bana = kant ? kant.getAttribute('d') : '';
    // Plocka ut varje talpar ur C-kommandona.
    const tal = bana.match(/-?\d+(\.\d+)?/g);
    return {
      svg,
      kropp,
      kant,
      bana,
      tal: tal ? tal.map(Number) : null,
      inne: false,
      sist: '',
      sistSkala: ''
    };
  });

  const io = new IntersectionObserver(
    (poster) => {
      for (const p of poster) {
        const s = spar.find((x) => x.svg === p.target);
        if (s) s.inne = p.isIntersecting;
      }
    },
    { rootMargin: '20% 0px' }
  );
  vagor.forEach((v) => io.observe(v));

  varvSteg.push((nu) => {
    if (reducerad.matches || flikenDold) return;

    // Alla mätningar först, alla skrivningar sedan. Låg rekt-läsningen
    // efter skrivningen av d tvingade webbläsaren till en ny layout
    // mitt i varvet, en gång per våg — fem framtvingade layouter per
    // bildruta för en effekt som inte ens behöver dem samtidigt.
    const narhet = new Map();
    for (const s of spar) {
      if (!s.inne || !s.tal) continue;
      const r = s.svg.getBoundingClientRect();
      narhet.set(s, 1 - Math.min(1, Math.abs(r.top) / window.innerHeight));
    }

    for (const s of spar) {
      if (!s.inne || !s.tal) continue;

      /* Varannan y-koordinat i banan är en kontrollpunkt att vagga.

         Utslaget dämpas nära viewBoxens kanter. Nu när kroppen bär
         grannens färg betyder en kurva som bågnar ovanför y=0 att
         fyllningen upphör där — och då möter sektionens egen färg
         grannen i en spikrak kant, mitt i vågen. Punkter som redan
         ligger nära 0 eller 90 vaggar alltså mindre, och kurvan kan
         aldrig lämna rutan. */
      const tal = s.tal.slice();
      let knut = 0;
      for (let i = 1; i < tal.length; i += 2) {
        const k = knut % 3;
        const fas =
          ((nu + VAG.forskjutning[k]) / VAG.perioder[k]) * Math.PI * 2;
        const bas = s.tal[i];
        // Några kontrollpunkter i källbanorna ligger redan UTANFÖR
        // rutan — en av dem på 90,7 i en ruta som är 90 hög. Utan
        // nedre gräns blev marginalen negativ och utslaget vände
        // fasen för just den punkten, uppmätt -4 i hitta-vågen.
        const marginal = Math.min(bas, VAG.hojd - bas);
        const utslag =
          VAG.utslag * Math.max(0, Math.min(1, marginal / VAG.utslag));
        tal[i] = bas + Math.sin(fas) * utslag;
        knut++;
      }

      let n = 0;
      const d = s.bana.replace(/-?\d+(\.\d+)?/g, () => tal[n++].toFixed(1));
      if (d === s.sist) continue;
      s.sist = d;

      if (s.kant) s.kant.setAttribute('d', d);
      // Kroppen är kurvan sluten upp till viewBoxens överkant. Ytan
      // som fylls är alltså den OVANFÖR vågen, och den bär grannens
      // färg — det är själva snittet mellan de två sektionerna.
      if (s.kropp) s.kropp.setAttribute('d', d + ' L1440,0 L0,0 Z');

      /* Scrubben: hur nära är sektionens överkant? Mätt ovan.

         Skrivs BARA när värdet ändrats, av samma skäl som banan. Den
         hängde tidigare med på varje bildruta där d ändrades — och
         eftersom d ändras varje bildruta medan vågen syns, sattes en
         ärvd anpassad egenskap om sextio gånger i sekunden även när
         sidan stod helt stilla. Custom properties ärvs, så varje
         skrivning smutsade ned svgn och båda dess banor. */
      const skala = (
        1 + (narhet.get(s) || 0) * (VAG.skalaMax() - 1)
      ).toFixed(3);
      if (skala !== s.sistSkala) {
        s.sistSkala = skala;
        s.svg.style.setProperty('--vag-skala', skala);
      }
    }
  });
}

/* ═══ 3 · KLISTERMÄRKENAS AVSKALNING ═════════════════════════════
   Förlaga: React Bits "Sticker Peel". Bladet klipps av på nedre
   vänstra hörnet, flärpen är hörnet vikt tillbaka över vecket, och
   glansen är en ljusreflex som följer pekaren.

   RIKTNINGEN. Märket kommer UPPVIKT och rullas ned på plats när man
   scrollar förbi. Tvärtom — fastklistrat som rivs upp — var det
   första bygget, och det läste fel: sidan rev sönder sin egen dekor
   medan man tittade på den. Ett klistermärke sätts dit, det tas inte
   bort. Nu är flärpen uppe när märket kommer in i vyn och ligger ned
   när man passerat det.

   Rörelsen går bara EN väg per besök. Att låta flärpen vika sig fram
   och tillbaka när man scrollar upp och ned hade läst som en trasig
   animation, inte som ett märke som sätts fast.

   Utgångsläget sätts härifrån av samma skäl som ankomsten: utan JS
   ska märket ligga fastklistrat, inte uppvikt. CSS-förvalet är 0.  */

function riggaAvskalning() {
  const marken = $$('.sticker');
  if (!marken.length) return;

  /* Går märket att rulla ned med scrollen?

     Rullningen är klar när märkets mitt nått h*0,5 − h*0,28 i vyn.
     Lägsta mitt ett märke kan nå är dess dokumentläge minus största
     möjliga scroll. Går den punkten inte tillräckligt högt — märket
     ligger ovanför vikningen, eller i footern där sidan tar slut —
     kan scrollen aldrig fullborda rullningen, och märket blir
     stående halvt uppvikt för alltid.

     De märkena markeras i stället som SATTA och trycks ned på tid av
     ankomsten. Räknat här, en gång, i stället för att hårdkodas per
     sektion: flyttas ett märke följer beslutet med. */
  const maxScroll = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight
  );
  const h = window.innerHeight;
  const spar = [];

  for (const m of marken) {
    if (!reducerad.matches) m.style.setProperty('--skal', '1');
    const dokumentY = m.getBoundingClientRect().top + window.scrollY + m.offsetHeight / 2;
    const lagstaMitt = dokumentY - maxScroll;
    if (lagstaMitt > h * 0.22) {
      m.setAttribute('data-satt', 'true');
      continue;
    }
    spar.push({ m, inne: false, min: 1 });
  }
  if (!spar.length) return;

  const io = new IntersectionObserver(
    (poster) => {
      for (const p of poster) {
        const s = spar.find((x) => x.m === p.target);
        if (s) s.inne = p.isIntersecting;
      }
    },
    { rootMargin: '10% 0px' }
  );
  marken.forEach((m) => io.observe(m));

  varvSteg.push(() => {
    if (reducerad.matches || flikenDold) return;
    const vy = window.innerHeight;

    /* Skyddsnät. Beslutet ovan om vad som går att rulla med scrollen
       fattas EN gång, vid riggningen, och sidhöjden ändras efteråt:
       menyrader fälls ut och in med drygt 400 px, radmaskerna byggs
       om vid ny bredd, sena bilder flyttar saker. Krymper sidan kan
       ett märke som bedömdes nåbart sluta vara det, och då stod det
       halvuppvikt för alltid.

       Är man längst ned finns ingen scroll kvar att vänta på, så
       allt som fortfarande är uppvikt trycks ned här. Det gör felet
       omöjligt oavsett vad som hänt med höjden sedan riggningen. */
    if (
      window.scrollY >=
      document.documentElement.scrollHeight - window.innerHeight - 2
    ) {
      for (const s of spar) {
        if (s.min <= 0) continue;
        s.min = 0;
        s.m.style.setProperty('--skal', '0');
      }
      return;
    }

    for (const s of spar) {
      if (!s.inne) continue;
      const r = s.m.getBoundingClientRect();
      const mitt = r.top + r.height / 2;
      // 0 medan märket är på väg upp mot vyns mitt, 1 när det nått en
      // fjärdedel upp. Flärpen är alltså uppe när märket kommer in.
      const rullat = Math.min(1, Math.max(0, (vy * 0.5 - mitt) / (vy * 0.28)));
      const skal = 1 - rullat;
      if (skal >= s.min) continue; // bara nedåt, aldrig tillbaka upp
      s.min = skal;
      s.m.style.setProperty('--skal', skal.toFixed(3));
    }
  });
}

/* ═══ 11 · BLICKEN ═══════════════════════════════════════════════
   MASKOTARNAS ÖGON GÅR INTE ATT FLYTTA. De är inmålade i en
   rasterbild, och att lägga en ny pupill ovanpå den gamla ger två
   pupiller, inte en som följer. Jag mätte upp bilderna för att se
   om ögonen gick att hitta programmatiskt och fylla över: klockan
   gav två rena, symmetriska träffar, de tre andra gav noll eller
   brus. Ett gäng där ett märke följer blicken och tre stirrar rakt
   fram läser som ett fel, inte som en effekt.

   Det som byggts i stället är samma avsikt med de medel bilden
   tillåter: märket LUTAR mot pekaren, med utjämning, inte
   direktmappning. Vill du ha riktig pupillföljning behöver ögonen
   levereras som egna genomskinliga lager ovanpå ansiktet, eller
   maskotarna ritas som SVG.                                        */

const BLICK_HALVERING = 130; // ms — motsvarar ungefär 0,4 s power3

function riggaBlick() {
  if (!pekareMedHover.matches) return;
  const marken = $$('.sticker');
  if (!marken.length) return;

  let malX = 0;
  let malY = 0;
  let x = 0;
  let y = 0;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      malX = (e.clientX / window.innerWidth) * 2 - 1;
      malY = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  varvSteg.push((nu, dt) => {
    if (reducerad.matches || flikenDold) return;
    x = mjuka(x, malX, BLICK_HALVERING, dt);
    y = mjuka(y, malY, BLICK_HALVERING, dt);
    for (const m of marken) {
      m.style.setProperty('--blick-x', x.toFixed(3));
      m.style.setProperty('--blick-y', y.toFixed(3));
    }
  });
}

/** Glansen följer pekaren över det enskilda märket. */
function riggaGlans() {
  if (!pekareMedHover.matches) return;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse' || reducerad.matches) return;
      for (const m of $$('.sticker')) {
        const r = m.getBoundingClientRect();
        const inne =
          e.clientX > r.left - 120 &&
          e.clientX < r.right + 120 &&
          e.clientY > r.top - 120 &&
          e.clientY < r.bottom + 120;
        m.style.setProperty('--glans', inne ? '1' : '0');
        if (!inne) continue;
        m.style.setProperty(
          '--gx',
          (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%'
        );
        m.style.setProperty(
          '--gy',
          (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%'
        );
      }
    },
    { passive: true }
  );
}

/* ═══ 4 · FOOTERJONGLERINGEN ═════════════════════════════════════
   Tre märken i båge. Apex 44–68 % av footerns höjd, 0,9–1,3 s upp med power2.out,
   nedvägen 1,15–1,5 gånger så lång med power2.in, 220–600 graders
   rotation och drift i x. Förskjutning 0,55 s mellan märkena.

   Asymmetrin upp/ned är det som gör kastet trovärdigt: uppåt
   bromsar det in mot apex, nedåt accelererar det. Lika lång väg i
   båda riktningarna läser som en studsboll i sirap.

   12 · TRÖGHETSKAST. Ett märke går att gripa mitt i flykten. Vid
   släpp ärver det pekarens hastighet gånger 30 och rotationen
   pekarens delta gånger 2, och bromsas med resistance 150 tills det
   faller tillbaka in i numret.                                     */

const JONGL = {
  /* APEX ÄR EN ANDEL AV SCENEN, inte av vyn. Med vyhöjden som mått
     låg högsta punkten på 540 px i en footer som var 436 — bitarna
     gick ur bild i överkant varje varv, och ett kast man inte ser
     toppen av läser inte som ett kast.

     Scenen är footern, och footern har en minsta höjd i stilmallen.
     Talen nedan är därför ett löfte som inte kan brytas av en ändrad
     vyhöjd.

     TAKET SÄNKTES FRÅN 0,78 NÄR BITARNA VÄXTE från 92 till 140 px.
     Det som ska rymmas är inte bitens bredd utan dess OMSLUTANDE RUTA
     under rotation, och den är diagonalen: en bit på 140 × 106 mäter
     176 px när den står på snedden. 0,78 × 612 + 176 blev 653 i en
     612 px hög footer, alltså klippt igen. 0,68 ger 416 + 176 = 592
     med tjugo pixlars marginal.

     Bågen blir därmed något lägre än den var. Det är priset för
     större bitar i samma rum, och det är rätt pris: en stor bit som
     syns hela vägen slår en liten som går ur bild. */
  apexMin: 0.44,
  apexMax: 0.68,
  uppMin: 900,
  uppMax: 1300,
  nedFaktorMin: 1.15,
  nedFaktorMax: 1.5,
  vridMin: 220,
  vridMax: 600,
  driftMax: 0.34,
  stagger: 550,
  kastFart: 30,
  kastVrid: 2,
  motstand: 150
};

const slump = (a, b) => a + Math.random() * (b - a);
const ut2 = (t) => 1 - (1 - t) * (1 - t); // power2.out
const in2 = (t) => t * t; // power2.in

function riggaJonglering() {
  const scen = $('#jonglering');
  if (!scen) return;
  const marken = $$('.jongl', scen);
  if (!marken.length) return;

  const nyttKast = (m, i, nu) => ({
    m,
    start: nu + i * JONGL.stagger,
    upp: slump(JONGL.uppMin, JONGL.uppMax),
    ned: 0,
    apex: slump(JONGL.apexMin, JONGL.apexMax),
    x0: slump(0.12, 0.82),
    drift: slump(-JONGL.driftMax, JONGL.driftMax),
    vrid: slump(JONGL.vridMin, JONGL.vridMax) * (Math.random() < 0.5 ? -1 : 1),
    grepp: null,
    fri: null
  });

  let kast = marken.map((m, i) => nyttKast(m, i, performance.now()));
  kast.forEach((k) => (k.ned = k.upp * slump(JONGL.nedFaktorMin, JONGL.nedFaktorMax)));

  let inne = false;
  new IntersectionObserver(
    ([p]) => {
      inne = p.isIntersecting;
      // Numret startar om när footern kommer i vy, annars står
      // märkena still i en godtycklig punkt av bågen.
      if (inne) {
        const nu = performance.now();
        kast.forEach((k, i) => {
          if (k.grepp || k.fri) return;
          k.start = nu + i * JONGL.stagger;
        });
      }
    },
    { threshold: 0 }
  ).observe(scen);

  /* ── Greppet ─────────────────────────────────────────────────── */

  for (const m of marken) {
    m.addEventListener('pointerdown', (e) => {
      const k = kast.find((x) => x.m === m);
      if (!k) return;
      try {
        m.setPointerCapture(e.pointerId);
      } catch {
        /* Utan capture tappas dragningen när pekaren lämnar märket,
           men greppet ska fungera ändå. */
      }
      m.setAttribute('data-grepp', 'true');
      const r = m.getBoundingClientRect();
      const s = scen.getBoundingClientRect();
      k.fri = null;
      k.grepp = {
        /* Respektera var i märket man tog tag — från dess ÖVRE VÄNSTRA
           HÖRN, inte från mitten.

           Greppläget ritas som translate3d(g.x - dx, ...), och den
           translationen flyttar bitens vänsterkant. Med dx mätt från
           mitten hamnade vänsterkanten där mitten stod, alltså ett
           hopp på halva bredden i samma ögonblick som man tog tag.
           Uppmätt 94 px förflyttning vid ett grepp som inte rörde sig
           alls — och felet växte när bitarna gick från 92 till 140 px.

           Det här är hela skillnaden mellan att hålla i något och att
           se det rycka till när man rör vid det. */
        dx: e.clientX - r.left,
        dy: e.clientY - r.top,
        x: e.clientX - s.left,
        y: e.clientY - s.top,
        vx: 0,
        vy: 0,
        vrid: 0,
        vinkel: 0,
        sistX: e.clientX,
        sistY: e.clientY,
        // Startpunkten sparas för klickgenomsläppet, se slapp().
        startX: e.clientX,
        startY: e.clientY
      };
    });

    m.addEventListener('pointermove', (e) => {
      const k = kast.find((x) => x.m === m);
      if (!k || !k.grepp) return;
      const s = scen.getBoundingClientRect();
      const g = k.grepp;
      g.vx = e.clientX - g.sistX;
      g.vy = e.clientY - g.sistY;
      g.sistX = e.clientX;
      g.sistY = e.clientY;
      g.x = e.clientX - s.left;
      g.y = e.clientY - s.top;
      g.vinkel += g.vx * JONGL.kastVrid;
    });

    const slapp = (e) => {
      const k = kast.find((x) => x.m === m);
      if (!k || !k.grepp) return;
      const g = k.grepp;
      m.removeAttribute('data-grepp');
      try {
        m.releasePointerCapture(e.pointerId);
      } catch {
        /* pekaren kan redan vara släppt */
      }
      k.grepp = null;

      /* KLICKGENOMSLÄPP. Bitarna ligger sedan de flyttades framför
         footerns innehåll ovanpå länkarna, och de tar emot pekaren
         eftersom de går att gripa. Uppmätt täcker de tillsammans tio
         procent av footerns länkyta vid varje given tidpunkt — var
         tionde klick på telefonnumret eller en länk hade alltså kunnat
         försvinna in i en köttpuck utan att något hände.

         En dragning och ett klick skiljer sig åt i en sak: dragningen
         rör sig. Flyttade pekaren sig mindre än sex pixlar mellan
         ned och upp var det ett klick, inte ett kast — och då letas
         elementet under biten upp och får klicket i stället.

         pointer-events stängs av på biten under uppslagningen,
         annars hittar elementFromPoint biten själv. */
      const rorelse = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
      if (rorelse < 6) {
        m.style.pointerEvents = 'none';
        const under = document.elementFromPoint(e.clientX, e.clientY);
        m.style.pointerEvents = '';
        const mal = under && under.closest('a, button');
        if (mal) mal.click();
      }

      /* INGEN RETURN EFTER KLICKET. Biten ska släppas som vanligt även
         när klicket gick vidare — den hade annars varken varit gripen
         eller fri, och varvet hade ritat den där dess gamla båge råkar
         vara just då. Uppmätt hopp när den återgick till bågen: 291 px
         tvärs över footern, i samma ögonblick som länken öppnades.

         Eftersom pekaren inte rörde sig är hastigheten nära noll, så
         det fria kastet nedan blir ett rent fall från den punkt där
         handen släppte. Vilket är precis vad som händer när man
         släpper något man höll stilla. */

      // Kastet ärver handens hastighet och bromsas in.
      // Samma hörnkoordinater som greppet, så släppet inte flyttar biten.
      k.fri = {
        x: g.x - g.dx,
        y: g.y - g.dy,
        vx: g.vx * JONGL.kastFart,
        vy: g.vy * JONGL.kastFart,
        vinkel: g.vinkel,
        vridFart: g.vx * JONGL.kastVrid * 20
      };
    };
    m.addEventListener('pointerup', slapp);
    m.addEventListener('pointercancel', slapp);
  }

  varvSteg.push((nu, dt) => {
    if (reducerad.matches || flikenDold) return;
    // Ett märke som hålls eller är i fritt fall ritas alltid. Bara
    // själva numret pausas utanför vyn — annars fryser det man håller
    // i handen så fort observatören blinkar.
    const nagotIHanden = kast.some((k) => k.grepp || k.fri);
    if (!inne && !nagotIHanden) return;

    const s = scen.getBoundingClientRect();
    const h = s.height || 1;
    const b = s.width || 1;

    for (const k of kast) {
      const m = k.m;
      if (!inne && !k.grepp && !k.fri) continue;

      /* KOORDINATERNA RÄKNAS MOT BITENS ÖVRE VÄNSTRA HÖRN, och därför
         måste bitens EGEN HÖJD med i y-ledet. Biten ligger med
         inset-block-end: 0, alltså är dess otransformerade överkant
         redan h − oh ned i scenen; en translation på (y − h) landade
         den en hel bithöjd för högt. Uppmätt: 91 px ryck i samma
         ögonblick som man tog tag, och felet växte med bitarna.

         offsetHeight och inte rektangeln: rektangeln är den ROTERADE
         omslutande rutan och ändras med vinkeln. */
      const oh = m.offsetHeight;

      if (k.grepp) {
        const g = k.grepp;
        m.style.transform = `translate3d(${(g.x - g.dx).toFixed(1)}px, ${(
          g.y -
          g.dy -
          h +
          oh
        ).toFixed(1)}px, 0) rotate(${g.vinkel.toFixed(1)}deg)`;
        continue;
      }

      if (k.fri) {
        const f = k.fri;
        const steg = dt / 1000;
        // resistance 150: farten dras ned proportionellt mot sig själv.
        const broms = Math.max(0, 1 - (JONGL.motstand / 1000) * steg * 6);
        f.vx *= broms;
        f.vy *= broms;
        f.vridFart *= broms;
        f.vy += 1400 * steg; // tyngdkraft, annars svävar kastet
        f.x += f.vx * steg;
        f.y += f.vy * steg;
        f.vinkel += f.vridFart * steg;

        // Nere igen: bitens UNDERKANT når scenens botten.
        if (f.y + oh >= h && f.vy > 0) {
          k.fri = null;
          k.start = nu;
          k.upp = slump(JONGL.uppMin, JONGL.uppMax);
          k.ned = k.upp * slump(JONGL.nedFaktorMin, JONGL.nedFaktorMax);
          k.x0 = Math.min(0.88, Math.max(0.08, f.x / b));
          continue;
        }
        m.style.transform = `translate3d(${f.x.toFixed(1)}px, ${(
          f.y -
          h +
          oh
        ).toFixed(1)}px, 0) rotate(${f.vinkel.toFixed(1)}deg)`;
        continue;
      }

      const gatt = nu - k.start;
      if (gatt < 0) {
        m.style.transform = `translate3d(${(k.x0 * b).toFixed(1)}px, 0, 0)`;
        continue;
      }

      const varv = k.upp + k.ned;
      const t = gatt % varv;
      let hojd;
      let del;
      if (t < k.upp) {
        del = t / k.upp;
        hojd = ut2(del) * k.apex * h; // bromsar in mot apex
      } else {
        del = (t - k.upp) / k.ned;
        hojd = (1 - in2(del)) * k.apex * h; // accelererar nedåt
      }

      const framsteg = t / varv;
      const x = (k.x0 + k.drift * framsteg) * b;
      const vinkel = k.vrid * framsteg;

      m.style.transform = `translate3d(${x.toFixed(1)}px, ${(-hojd).toFixed(
        1
      )}px, 0) rotate(${vinkel.toFixed(1)}deg)`;
    }
  });
}

/* ═══ 5 · NAVBAREN VIKER UNDAN ═══════════════════════════════════
   Tröskeln på 6 px är det som gör skillnaden mellan en list som
   viker undan och en som fladdrar: utan den räcker en pixels
   studs i tröghetsscrollen för att vända riktningen.               */

function riggaNav() {
  const nav = $('#nav');
  if (!nav) return;
  let sist = window.scrollY;

  varvSteg.push(() => {
    const y = window.scrollY;
    const delta = y - sist;
    if (Math.abs(delta) < 6) return;
    sist = y;
    // Under 40 px är navigationen en del av sidhuvudet och står kvar.
    nav.setAttribute('data-undan', String(delta > 0 && y > 40));
  });
}

/* ═══ 7 · MASKERAD RADAVSLÖJNING ═════════════════════════════════
   Ord för ord är rätt för en rubrik och fel för ett stycke: ögat
   hinner läsa klart innan sista ordet kommit fram. Längre stycken
   avslöjas rad för rad bakom en mask.

   Raderna måste mätas, inte gissas. Varje ord får ett eget span,
   orden grupperas på offsetTop, och varje grupp läggs i en mask.
   Vid omritning i ny bredd bryter texten på andra ställen — därför
   byggs maskerna om vid resize, men bara när bredden faktiskt
   ändrats.                                                         */

function riggaRadavslojning() {
  const mal = $$('[data-rader]');
  if (!mal.length) return;

  /* Stycket byggs om med DOM-flytt, inte med innerHTML. Ett av
     rebrandstyckena bär ett kritstreck som inline-SVG mitt i en
     mening; en ombyggnad ur textContent hade tystat bort det utan
     att någon märkt det förrän strecket var borta.

     Därför: bara textnoder delas i ord, elementbarn lämnas som de
     är, och raderna byggs genom att FLYTTA noderna in i sina
     masker. Då överlever allt som stod i stycket. */
  const bygg = (el) => {
    if (!el.dataset.original) el.dataset.original = el.innerHTML;
    else el.innerHTML = el.dataset.original;

    const platta = [];
    const dela = (nod) => {
      for (const barn of [...nod.childNodes]) {
        if (barn.nodeType === Node.TEXT_NODE) {
          const bitar = barn.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          for (const b of bitar) {
            if (!b) continue;
            if (/^\s+$/.test(b)) {
              frag.append(document.createTextNode(b));
            } else {
              const sp = document.createElement('span');
              sp.className = 'mat-ord';
              sp.textContent = b;
              frag.append(sp);
              platta.push(sp);
            }
          }
          barn.replaceWith(frag);
        } else if (barn.nodeType === Node.ELEMENT_NODE) {
          // Elementbarn behålls intakt och räknas som ett ord.
          platta.push(barn);
        }
      }
    };
    dela(el);

    // Gruppera på vilken rad varje ord faktiskt hamnade.
    const rader = [];
    let toppen = null;
    for (const o of platta) {
      const t = o.offsetTop;
      if (toppen === null || Math.abs(t - toppen) > 4) {
        toppen = t;
        rader.push([]);
      }
      rader[rader.length - 1].push(o);
    }

    /* Mellanrummen FLYTTAS med, de hittas inte på. Förut lades ett
       blanksteg efter varje nod, och då fick "smashade</span>," ett
       mellanslag mitt i: "smashade ,". Ett elementbarn som följs
       direkt av skiljetecken är precis det fallet, och kritstrecket
       under ordet smashade är ett sådant element. */
    const efterforande = new Map();
    for (const o of platta) {
      const n = o.nextSibling;
      if (n && n.nodeType === Node.TEXT_NODE && /^\s+$/.test(n.textContent)) {
        efterforande.set(o, n);
      }
    }

    for (const rad of rader) {
      const mask = document.createElement('span');
      mask.className = 'rad-mask';
      const inre = document.createElement('span');
      mask.append(inre);
      rad[0].before(mask);
      for (const o of rad) {
        inre.append(o);
        const mellan = efterforande.get(o);
        if (mellan) inre.append(mellan);
      }
    }
    // Kvarvarande lösa blanksteg mellan maskerna.
    for (const n of [...el.childNodes]) {
      if (n.nodeType === Node.TEXT_NODE) n.remove();
    }
    return $$('.rad-mask', el);
  };

  const io = new IntersectionObserver(
    (poster) => {
      for (const p of poster) {
        if (!p.isIntersecting) continue;
        io.unobserve(p.target);
        $$('.rad-mask', p.target).forEach((r, i) => {
          // stagger .06 mellan raderna
          r.style.transitionDelay = `${i * 60}ms`;
          r.querySelector('span').style.transitionDelay = `${i * 60}ms`;
          r.setAttribute('data-inne', 'true');
        });
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
  );

  mal.forEach((el) => {
    bygg(el);
    io.observe(el);
  });

  let sistBredd = window.innerWidth;
  window.addEventListener(
    'resize',
    () => {
      if (window.innerWidth === sistBredd) return;
      sistBredd = window.innerWidth;
      for (const el of mal) {
        const varInne = !!el.querySelector('.rad-mask[data-inne="true"]');
        bygg(el);
        if (varInne) {
          $$('.rad-mask', el).forEach((r) =>
            r.setAttribute('data-inne', 'true')
          );
        } else {
          io.observe(el);
        }
      }
    },
    { passive: true }
  );
}

/* ═══ 8 · MIKROPULS VID BEKRÄFTELSE ══════════════════════════════
   Pulsen är ett kvitto: den säger att trycket gick fram. Den hör
   alltså hemma där något faktiskt bekräftas, inte på varje klick.
   Här: när beställningslänken följs, och när en flik i menyn byts.  */

function pulsa(el) {
  if (!el || reducerad.matches) return;
  el.removeAttribute('data-puls');
  // Tvinga fram en omräkning så att pulsen går att spela om direkt.
  void el.offsetWidth;
  el.setAttribute('data-puls', 'true');
  el.addEventListener(
    'animationend',
    () => el.removeAttribute('data-puls'),
    { once: true }
  );
}

function riggaPuls() {
  for (const sel of ['#bestall-lank', '#orderbar-lank']) {
    const el = $(sel);
    if (el) el.addEventListener('click', () => pulsa(el));
  }
  const flikar = $('#meny-flikar');
  if (flikar) {
    flikar.addEventListener('click', (e) => {
      const b = e.target.closest('.flik');
      if (b) pulsa(b);
    });
  }
}

/* ═══ 10 · PEKARKEDJAN ═══════════════════════════════════════════
   Åtta leder som släpar efter pekaren: ett huvud, fyra
   ingrediensknutar och tre prickar emellan. Huvudet hinner ikapp
   snabbt, varje led därefter en gnutta långsammare — det är
   fördröjningstrappan som gör kedjan till en kedja och inte till
   åtta punkter i rad.

   CRAV låter systemmarkören ligga kvar under sin kedja, så man ser
   två pekare. Den döljs här. cursor: none sätts genom en klass på
   html från JS och inte i stilmallen: slutar skriptet fungera ska
   markören finnas kvar, och en sida utan synlig pekare är inte en
   sida man kan använda.

   Aldrig på touch. En kedja som jagar en pekare som inte finns är
   åtta element som ritas om i onödan.                               */

const KEDJA = {
  // Halveringstider ur förlagans varaktigheter: head .05s power2.out,
  // segment .12 + .01·i s power3.out.
  huvud: 16,
  segBas: 38,
  segSteg: 3.2,
  /* Knutarna var burgarlagren A1, A2, A4 och A5 — bilder skurna för
     den dåvarande lagerscenen, där de visades 500 px breda. I en knut
     på 30 px blev de färgfläckar. Ingredienserna är frilagda och fotade något uppifrån
     och tål att visas små.

     Andra varianten av varje motiv, eftersom första varianten
     jonglerar i footern. Samma bild ska inte stå på två ställen
     samtidigt. */
  knutar: ['kott-2', 'ost-2', 'sallad-2', 'tomat-2']
};

function riggaKedja() {
  if (!pekareMedHover.matches || reducerad.matches) return;

  const scen = document.createElement('div');
  scen.className = 'kedja';
  scen.setAttribute('aria-hidden', 'true');

  const leder = [];
  let hand = null;
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('span');
    if (i === 0) {
      el.className = 'led led--huvud';
      hand = document.createElement('img');
      hand.src = '/bilder/granssnitt/muspekare.webp';
      hand.alt = '';
      hand.decoding = 'async';
      el.append(hand);
    } else if (i % 2 === 1 && KEDJA.knutar[(i - 1) / 2]) {
      el.className = 'led led--knut';
      const bild = document.createElement('img');
      bild.src = `/bilder/ingredienser/${KEDJA.knutar[(i - 1) / 2]}.webp`;
      bild.alt = '';
      bild.decoding = 'async';
      el.append(bild);
    } else {
      el.className = 'led led--prick';
    }
    scen.append(el);
    leder.push({ el, x: -200, y: -200 });
  }
  document.body.append(scen);

  let malX = -200;
  let malY = -200;
  let over = false;
  let avstangd = false;
  // Vilar handen? Då finns inget släp att visa och inget att rita om.
  let vilar = true;
  let vilotimer = 0;
  const VILA_MS = 420;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      malX = e.clientX;
      malY = e.clientY;
      if (vilar) {
        vilar = false;
        scen.removeAttribute('data-vilar');
      }
      clearTimeout(vilotimer);
      vilotimer = setTimeout(() => {
        vilar = true;
        scen.setAttribute('data-vilar', 'true');
      }, VILA_MS);
      const t = e.target;
      const nu = !!(
        t &&
        t.closest &&
        t.closest('a, button, [role="tab"], .kastbar, .ratt__knapp')
      );
      if (nu !== over) {
        over = nu;
        scen.setAttribute('data-over', String(over));
      }
    },
    { passive: true }
  );

  // Ut ur fönstret: kedjan ska inte hänga kvar i en kant.
  document.addEventListener('pointerleave', () => {
    malX = -200;
    malY = -200;
  });

  /* En dold systemmarkör är ett löfte om att ersättningen duger. Det
     löftet håller inte för alla: den som förstorat markören i
     operativsystemets hjälpmedel har gjort det av ett skäl, och en
     ring på 26 px är inte samma sak. Det går inte att känna av.

     Därför en väg tillbaka som inte kräver att man vet om den:
     Escape stänger kedjan, och så fort någon rör vid tangentbordet
     för att navigera — Tab — kommer markören tillbaka och stannar.
     Den som styr med tangentbord ska aldrig sitta utan pekare. */
  const slaAv = () => {
    document.documentElement.classList.remove('kedja-pa');
    scen.remove();
    avstangd = true;
  };

  /* Systemmarkören döljs FÖRST när handen är målad, inte när kedjan
     byggs. Huvudet är en bild nu, och mellan att kedjan skapas och att
     bilden hunnit avkodas fanns ett glapp där cursor: none redan
     gällde men ingenting ritats — alltså en sida helt utan synlig
     pekare. Kort, men det är just det läget som inte får uppstå.

     Går bilden inte att ladda alls rivs hela kedjan: ett släp utan
     huvud är ingen pekare, och då ska systemets egen stå kvar. */
  hand
    .decode()
    .then(() => {
      if (!avstangd) document.documentElement.classList.add('kedja-pa');
    })
    .catch(slaAv);
  window.addEventListener('keydown', (e) => {
    if (avstangd) return;
    if (e.key === 'Escape' || e.key === 'Tab') slaAv();
  });

  scen.setAttribute('data-vilar', 'true');

  varvSteg.push((nu, dt) => {
    if (flikenDold || avstangd) return;
    // I vila, när huvudet hunnit fram, finns ingenting att räkna om.
    // Leden ligger redan på sin punkt och släpet är bortstonat.
    if (
      vilar &&
      Math.abs(leder[0].x - malX) < 0.5 &&
      Math.abs(leder[0].y - malY) < 0.5
    ) {
      return;
    }
    for (let i = 0; i < leder.length; i++) {
      const led = leder[i];
      const mx = i === 0 ? malX : leder[i - 1].x;
      const my = i === 0 ? malY : leder[i - 1].y;
      const halv = i === 0 ? KEDJA.huvud : KEDJA.segBas + KEDJA.segSteg * i;
      led.x = mjuka(led.x, mx, halv, dt);
      led.y = mjuka(led.y, my, halv, dt);
      led.el.style.transform = `translate3d(${led.x.toFixed(
        1
      )}px, ${led.y.toFixed(1)}px, 0)`;
    }
  });
}

/* ═══ 13 · LADDSKÄRMENS STUK ═════════════════════════════════════
   Varje lager faller in och stukas vid nedslaget; stapeln som
   helhet stukas när sista lagret landat. Taket på 1,8 s och
   överhoppningen vid återbesök står kvar — fysiken får plats inuti
   den budgeten, den förlänger den inte.                            */

function stukaStapeln() {
  const stack = $('.loader__stack');
  if (!stack || reducerad.matches) return;
  stack.setAttribute('data-stuk', 'true');
  stack.addEventListener(
    'animationend',
    () => stack.removeAttribute('data-stuk'),
    { once: true }
  );
}

/* ═══ SCROLLVARVET ═══════════════════════════════════════════════
   Ett enda requestAnimationFrame-varv för hela sidan. Det driver den
   fasta navbaren direkt och allt annat via varvSteg.

   LAGERPARALLAXEN LÅG HÄR FÖRUT. Den är borta med lagersektionen;
   scroll-sekvensen nedan registrerar sig i varvSteg som alla andra
   effekter i stället för att ha en egen gren i själva varvet.     */

function riggaScroll() {
  const nav = $('#nav');
  let sistFast = null;

  const lasNav = () => {
    const fast = String(window.scrollY > 40);
    if (fast === sistFast) return; // skriv inte samma attribut varje ruta
    sistFast = fast;
    nav.setAttribute('data-fast', fast);
  };

  // Ett varv för allt scrollstyrt OCH för all löpande rörelse. Varje
  // ny effekt registrerar sig i varvSteg i stället för att starta ett
  // eget varv — åtta rAF-loopar hade konkurrerat om samma bildruta.
  let forra = performance.now();
  const varv = (nu) => {
    const dt = Math.min(64, nu - forra); // hoppa inte vid flikbyte
    forra = nu;
    lasNav();
    for (const steg of varvSteg) steg(nu, dt);
    requestAnimationFrame(varv);
  };

  lasNav();
  requestAnimationFrame(varv);
}

/* ═══ 4 · SCROLL-SEKVENSEN ═══════════════════════════════════════
   En filmad burgare som faller isär och byggs ihop igen, scrubbad
   direkt av scrollen. Rutorna görs av verktyg/sekvens.mjs ur
   originalvideon och ligger i public/bilder/sekvens/.

   TRE BESLUT BÄR HELA FUNKTIONEN.

   1. STILLBILD ÄR GRUNDLÄGET, INTE RESERVEN. Sektionen är ett
      stillastående block tills den här funktionen sätter
      data-rorlig på den. Allt som kan gå fel — ingen JS, reducerad
      rörelse, Save-Data, 2G, ingen canvas — leder till att attributet
      aldrig sätts, och då står stillbilden kvar i ett block med
      normal höjd. Ingen behöver scrolla förbi två och en halv tomma
      skärmar.

   2. KOMPRIMERAT I MINNET, AVKODAT I ETT FÖNSTER. Alla rutor hämtas
      som Blob och stannar som komprimerade byte: 4,7 MB för hela
      desktopuppsättningen. AVKODADE är de däremot bara i ett rullande
      fönster kring den ruta som visas. En avkodad ruta kostar
      bredd × höjd × 4 byte — 3,52 MB sedan rutorna blev 1280×720 — så
      hela sekvensen avkodad hade varit 422 MB. Fönstret är 16 rutor,
      alltså 56 MB, och de som faller ur stängs med close().

      FÖNSTRET KRYMPTE NÄR RUTAN VÄXTE. 1280 i stället för 800 är 2,56
      gånger så många pixlar, och 22 rutor hade blivit 77 MB avkodat —
      på en telefon är det en flik som riskerar att slängas ut. 16
      rutor lägger sig på 56. Priset är kortare startsträcka framåt:
      12 rutor är omkring 130 px scroll på desktop mot 173 förut. Den
      som flickar förbi det får grannens ruta i stället, vilket är
      precis vad narmaste() finns till för.

   3. HÄMTNINGEN GÅR I TRE PASS. Först ruta 1, så duken aldrig är tom.
      Sedan var fjärde ruta — då går hela sekvensen redan att scrubba,
      om än grovt, på en fjärdedel av vikten. Sist resten. Att hämta
      1 till 120 i ordning hade gett en sekvens som är färdig i
      början och tom i slutet under hela laddningen.               */

const SEKV = {
  /* Brytpunkten står OCKSÅ i style.css (@media max-width: 760px).
     Ändras den på ett ställe måste den ändras på det andra. */
  brytMobil: 760,

  /* Rutor per uppsättning. Måste stämma med UTGAVOR i
     verktyg/sekvens.mjs — en ruta för mycket är en 404, en för lite
     är en sekvens som slutar innan spåret gör det. */
  rutor: { desktop: 120, mobil: 80 },

  /* Det rullande fönstret av AVKODADE rutor, i scrollriktningen och
     mot den. Asymmetriskt med flit: man scrollar nästan alltid vidare
     åt samma håll, och de få rutorna bakåt räcker för att vända utan
     att det syns. */
  fram: 12,
  bak: 4,

  /* Samtidiga hämtningar. Sex är ungefär där HTTP/2 slutar tjäna på
     fler strömmar och börjar betala för dem. */
  parallellt: 6,

  /* Grovpassets steg. Var fjärde ruta = 30 rutor på desktop, ungefär
     670 kB, och sekvensen går att dra igenom hela vägen. */
  grovt: 4,

  /* Hur långt sekvensen hunnit när scenen SLÄPPER och börjar åka ut.

     Passagen består av två olika saker. Först står scenen klistrad
     och fyller rutan — det är där sekvensen hör hemma. Sedan åker den
     ut, och det man ser är en remsa som krymper i överkanten medan
     nästa sektion tar plats.

     Linjärt över hela passagen hamnade 40 procent av rutorna i
     utåkningen: burgaren byggdes färdigt i en remsa ingen tittar på.
     Med 0,95 ligger 114 av 120 rutor i det klistrade läget, och de
     sista sex kryper fram medan scenen lämnar. Sekvensen står aldrig
     still, och finalen landar på hel skärm. */
  klistratSlut: 0.95
};

function riggaSekvens() {
  const sek = $('#sekvens');
  if (!sek) return;

  const spar = $('#sekvens-spar', sek);
  const scen = $('.sekvens__scen', sek);
  const duk = $('#sekvens-duk', sek);
  if (!spar || !duk) return;

  const ctx = duk.getContext && duk.getContext('2d', { alpha: false });
  if (!ctx) return; // ingen canvas: stillbilden står kvar

  /* ── GRINDEN ────────────────────────────────────────────────────
     Fyra skäl att låta bli, och alla fyra leder till samma sak:
     stillbilden. De läses en gång, vid start. Att lyssna på
     förändringar hade betytt att kunna riva en pågående sekvens mitt
     i en scroll, och det är en sämre upplevelse än att en inställning
     slår igenom först vid omladdning. */

  const natet = navigator.connection;
  const sparaData = Boolean(natet && natet.saveData);
  const langsamt = Boolean(
    natet && /(^|-)(2g|slow-2g)$/.test(natet.effectiveType || '')
  );

  if (reducerad.matches || sparaData || langsamt) return;

  /* ── UPPSÄTTNING ────────────────────────────────────────────────
     Vilken uppsättning som hämtas avgörs av vyns bredd, samma
     brytpunkt som spårets höjd. Den läses en gång: att byta
     uppsättning mitt i besöket hade betytt att hämta 1,4 MB till för
     att någon vände på telefonen. */

  const mobil = window.innerWidth <= SEKV.brytMobil;
  const utgava = mobil ? 'mobil' : 'desktop';
  const antal = SEKV.rutor[utgava];

  const adress = (i) =>
    `/bilder/sekvens/${utgava}/r${String(i + 1).padStart(3, '0')}.webp`;

  /* Komprimerade byte, en post per ruta. 22,5 kB styck på desktop. */
  const blobbar = new Array(antal);
  /* Avkodade rutor. Bara fönstrets innehåll är satt, resten undefined. */
  const rutor = new Array(antal);
  /* Index som har en avkodning på gång, så samma ruta inte startas två
     gånger när fönstret glider fram över den. */
  const pagar = new Set();
  /* Index som är avkodade just nu — billigare att gå igenom än att
     söka i en array på 120 platser varje bildruta. */
  const levande = new Set();

  let hamtade = 0;
  let ritad = -1;
  let forraIndex = 0;
  let riktning = 1;
  let tand = false;
  let fonsterMin = 0;
  let fonsterMax = 0;

  const ifonster = (i) => i >= fonsterMin && i <= fonsterMax;

  /* ── RITNINGEN ─────────────────────────────────────────────────
     Duken är exakt en bildrutas storlek, så drawImage skalar
     ingenting. CSS sköter storleken på skärmen.

     DET ÄR ETT KRAV, INTE EN IAKTTAGELSE. drawImage(bild, 0, 0) ritar
     i bildens egen storlek, så duken i index.html måste ha samma mått
     som UTGAVOR i verktyg/sekvens.mjs. En mindre duk visar rutans
     övre vänstra hörn och inget annat. */

  const rita = (i) => {
    const bild = rutor[i];
    if (!bild) return false;
    ctx.drawImage(bild, 0, 0);
    ritad = i;
    if (!tand) {
      tand = true;
      duk.setAttribute('data-tand', 'true');
    }
    return true;
  };

  /** Närmaste avkodade ruta åt något håll. Används när den önskade
   *  rutan ännu inte hunnit fram: hellre grannen än ingenting. */
  const narmaste = (i) => {
    for (let d = 1; d < antal; d++) {
      if (rutor[i - d]) return i - d;
      if (rutor[i + d]) return i + d;
    }
    return -1;
  };

  /* ── AVKODNINGEN ────────────────────────────────────────────────
     createImageBitmap avkodar utanför huvudtråden, så en ruta som
     tar tid stoppar inte varvet. */

  const avkoda = (i) => {
    if (i < 0 || i >= antal || rutor[i] || pagar.has(i) || !blobbar[i]) return;
    pagar.add(i);
    createImageBitmap(blobbar[i])
      .then((bild) => {
        pagar.delete(i);
        // Hann fönstret glida förbi medan avkodningen pågick är rutan
        // redan inaktuell. Stäng den direkt i stället för att lägga
        // den i minnet och plocka bort den nästa bildruta.
        if (!ifonster(i)) {
          bild.close();
          return;
        }
        rutor[i] = bild;
        levande.add(i);
      })
      .catch(() => pagar.delete(i));
  };

  const stallFonster = (mitt) => {
    fonsterMin = Math.max(0, mitt - (riktning >= 0 ? SEKV.bak : SEKV.fram));
    fonsterMax = Math.min(
      antal - 1,
      mitt + (riktning >= 0 ? SEKV.fram : SEKV.bak)
    );

    for (const i of levande) {
      if (ifonster(i)) continue;
      rutor[i].close();
      rutor[i] = undefined;
      levande.delete(i);
    }

    // Närmast först, så det som behövs härnäst avkodas först.
    for (let d = 0; d <= fonsterMax - fonsterMin; d++) {
      const fram = mitt + d * riktning;
      const bak = mitt - d * riktning;
      if (ifonster(fram)) avkoda(fram);
      if (ifonster(bak)) avkoda(bak);
    }
  };

  /* ── HÄMTNINGEN ────────────────────────────────────────────────── */

  const hamtaRuta = (i) =>
    blobbar[i]
      ? Promise.resolve()
      : fetch(adress(i))
          .then((r) => (r.ok ? r.blob() : null))
          .then((b) => {
            if (!b) return;
            blobbar[i] = b;
            hamtade++;
            // Första rutan ritas så fort den finns, även om ingen
            // scrollat hit än. Duken ska aldrig vara tom när sektionen
            // kommer i vy.
            if (i === 0 && !tand) avkoda(0);
            else if (ifonster(i)) avkoda(i);
          })
          .catch(() => {});

  /** Kör en lista index med tak på antalet samtidiga hämtningar. */
  const koa = async (lista) => {
    let n = 0;
    const arbetare = async () => {
      while (n < lista.length) await hamtaRuta(lista[n++]);
    };
    await Promise.all(
      Array.from({ length: Math.min(SEKV.parallellt, lista.length) }, arbetare)
    );
  };

  const hamtaAllt = async () => {
    await hamtaRuta(0);

    const grovt = [];
    for (let i = SEKV.grovt; i < antal; i += SEKV.grovt) grovt.push(i);
    await koa(grovt);

    const resten = [];
    for (let i = 1; i < antal; i++) if (!blobbar[i]) resten.push(i);
    await koa(resten);
  };

  /* ── SPÅRET ────────────────────────────────────────────────────
     Rörligt läge sätts först, så spåret får sin höjd, och sedan
     mäts det. Tvärtom hade gett passagen = 0. */

  sek.setAttribute('data-rorlig', 'true');

  /* PASSAGEN ÄR HELA SPÅRET, inte den klistrade delen av det.

     Förut drogs vyns höjd av: strackan = spårets höjd MINUS en skärm.
     Det är precis så länge scenen står klistrad, så sista bildrutan
     nåddes i samma ögonblick som scenen släppte och började åka ut.
     Kvar fanns en hel skärmhöjd av spåret — 867 px av 2168 på en
     900 px vy, alltså 29 procent av passagen — där man scrollade
     förbi en frusen bild.

     Nu mäts framsteget mot spårets HELA höjd: ruta 1 när spårets
     överkant når vyns överkant, sista rutan när spårets underkant
     gör det. Hela passagen driver hela sekvensen.

     HÖJDEN MÄTS, DEN ANTAS INTE. window.innerHeight var fel mått även
     bortsett från det här: scenen är 100svh, och svh är INTE
     innerHeight på en telefon där adressfältet växer och krymper.
     Spårets egen offsetHeight är samma tal som CSS räknat fram, på
     varje vy. */
  let passagen = 1;
  let klistrat = 0.6;
  const mat = () => {
    passagen = Math.max(1, spar.offsetHeight);
    /* Andelen av passagen där scenen står klistrad. Scenen är 100svh
       och spåret 250svh, alltså 0,6 på desktop och 0,5 på mobil där
       spåret är 200svh. Mätt, inte antaget: svh och innerHeight är
       inte samma tal när telefonens adressfält växer. */
    const h = scen ? scen.offsetHeight : window.innerHeight;
    klistrat = Math.max(0.05, Math.min(0.95, (passagen - h) / passagen));
  };
  mat();
  window.addEventListener('resize', mat, { passive: true });

  /* Hämtningen startar när sektionen är en hel skärm bort, inte när
     den är framme. 2,7 MB hinner inte fram på den sista skärmen, och
     att börja tidigare hade betytt att varenda besökare betalar för
     en sektion hen kanske aldrig når. */
  const io = new IntersectionObserver(
    (poster) => {
      if (!poster.some((p) => p.isIntersecting)) return;
      io.disconnect();
      hamtaAllt();
    },
    { rootMargin: '100% 0px' }
  );
  io.observe(spar);

  /* ── VARVET ────────────────────────────────────────────────────
     Registrerar sig i sidans enda rAF-varv. Läser ETT rekt per
     bildruta och skriver ingenting till DOM:en utom när rutan
     faktiskt byts. */

  varvSteg.push(() => {
    if (flikenDold || !hamtade) return;

    const r = spar.getBoundingClientRect();
    // Ingenting att göra medan sektionen är utanför vyn.
    if (r.bottom < 0 || r.top > window.innerHeight) return;

    /* Passagen delas vid den punkt där scenen släpper. Före den
       punkten ligger 95 procent av sekvensen, efter den de sista fem
       — se SEKV.klistratSlut. Båda delarna är linjära och lutningen
       är positiv i båda, så rutan byter hela vägen: ingen del av
       spåret står still, och finalen hinner landa medan scenen
       fortfarande fyller rutan.

       Knycken i farten sitter exakt där scenen börjar röra sig. Då
       följer ögat scenens rörelse, inte burgarens bygge, och en
       sekvens som saktar in just där läser som att den lägger sig
       till ro — inte som ett hack. */
    const p = Math.min(1, Math.max(0, -r.top / passagen));
    const framsteg =
      p <= klistrat
        ? (p / klistrat) * SEKV.klistratSlut
        : SEKV.klistratSlut +
          ((p - klistrat) / (1 - klistrat)) * (1 - SEKV.klistratSlut);
    const i = Math.round(framsteg * (antal - 1));

    if (i !== forraIndex) {
      riktning = i > forraIndex ? 1 : -1;
      forraIndex = i;
      stallFonster(i);
    }

    if (i === ritad) return;

    if (!rita(i)) {
      // Rutan är inte avkodad än. Rita grannen hellre än att lämna
      // duken stående på en ruta långt bort — under laddningen är det
      // skillnaden mellan en grov sekvens och en frusen bild.
      const n = narmaste(i);
      if (n >= 0 && n !== ritad) rita(n);
    }
  });

  // Första fönstret ställs direkt, annars avkodas ingenting förrän
  // någon scrollat en ruta.
  stallFonster(0);
}

/* ═══ FOTONAS ANKOMST ════════════════════════════════════════════
   Sajtens fem riktiga foton kommer en gång när de först syns. All
   timing ligger i stilmallen; det här är avtryckaren.

   UTGÅNGSLÄGET SÄTTS HÄRIFRÅN. Attributet står tomt i uppmärkningen,
   så utan JS matchar ingen av reglerna och fotot står färdigt. Låg
   maskerat läge i CSS hade en besökare utan JS fått fem tomma rutor
   där bilderna ska vara.

   Observatören kopplar bort varje foto för sig så fort det kommit
   fram. Att spela om ankomsten varje gång man scrollar förbi är det
   som gör scrollutlösta effekter tröttsamma andra gången.

   MENYBILDERNA RÖRS INTE. De har redan sin ankomst när raden öppnas,
   och de är sidans högfrekventa fall — ett foto byts varje gång någon
   öppnar en rad. Där ska man dra ned, inte lägga till.            */

function riggaFoton() {
  const foton = $$('[data-foto]');
  if (!foton.length) return;

  foton.forEach((f) => f.setAttribute('data-foto', 'vantar'));

  /* Masken öppnas först när bilden GÅR ATT RITA. Fotona är lazy, och
     en mask som öppnar sig på en bild som inte hunnit fram avslöjar
     sektionens bakgrund — sedan dyker fotot upp efteråt. Då är
     ankomsten inte längre en ankomst utan två.

     decode() på en redan hämtad bild löser sig i en mikrouppgift, så
     i det normala fallet kostar det ingenting. Misslyckas den släpps
     fotot ändå: en trasig bild är illa, ett foto som aldrig kommer
     fram är värre. Samma gate som laddskärmens lager har. */
  const slapp = (ram) => {
    const bild = $('img', ram);
    const satt = () => ram.setAttribute('data-foto', 'kommer');
    if (bild && bild.decode) bild.decode().catch(() => {}).then(satt);
    else satt();
  };

  const io = new IntersectionObserver(
    (poster) => {
      for (const p of poster) {
        if (!p.isIntersecting) continue;
        io.unobserve(p.target);
        slapp(p.target);
      }
    },
    // Samma konvention som ord- och radavslöjningen.
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  );

  foton.forEach((f) => io.observe(f));
}

/* ═══ FOTOKORTEN — FÖLJNING OCH KAST ═════════════════════════════
   Sex kort som beter sig som föremål. Ingen knapp, ingen dragning:
   kortet följer pekaren så fort den är över det, och när pekaren
   lämnar det kastas det i väg och bromsar in mot sitt viloläge.

   VÄRDENA ÄR CRAV:S, och mekaniken är sajtens egen — samma
   tröghetskast som ligger i footerns jonglering, kopplat hit:

     fart      30 × pekarens rörelse vid utträdet
     vridning  2 × kortets grundvinkel, som tak
     motstånd  150

   FÖLJNINGEN ÄR DÄMPAD, och det är inte en smaksak. Följer kortet
   pekaren ett mot ett står pekaren stilla i förhållande till kortet —
   den kan aldrig lämna det, och kastet utlöses aldrig. Med 0,55 glider
   pekaren ifrån kortet och når till slut kanten. Taket på 64 px finns
   av samma skäl: utan det kan ett kort dras hur långt som helst från
   sin plats och tappar sambandet med spalten det hör till.

   VRIDNINGEN FÖLJER FÖRFLYTTNINGEN I SIDLED, inte pekarens hastighet.
   Ett kort som vrids av farten snurrar okontrollerat vid ett snabbt
   ryck; ett kort som vrids av var det ligger lutar åt det håll det
   dragits, vilket är vad ett föremål på ett bord gör. Taket är två
   gånger grundvinkeln, så ett kort med 3,5 graders viloläge kan luta
   som mest sju.

   HEMGÅNGEN ÄR EN FJÄDER med dämpning nära kritisk. Ett kort som
   studsar tillbaka läser som gummi; ett som glider hem läser som
   papper med friktion mot bordet.

   MOBILEN HAR INGEN HOVER, och det finns ingenting att följa. Där
   står korten i sin grundlutning med sina rundade hörn och sin
   skugga — fysiska av form, inte av rörelse. Att lösa det med
   dragning vore att bygga just det du sa nej till.             */

const KORT = {
  folj: 0.55,
  tak: 64,
  vridTakFaktor: 2,
  vridPerPx: 0.06,
  kastFart: 30,
  motstand: 150,
  fjaderK: 78,
  fjaderD: 13
};

function riggaFotokort() {
  const kort = $$('.foto');
  if (!kort.length) return;
  if (reducerad.matches || !pekareMedHover.matches) return;

  const klamp = (v, max) => Math.max(-max, Math.min(max, v));

  const spar = kort.map((el) => {
    const lut = parseFloat(getComputedStyle(el).getPropertyValue('--lut')) || 0;
    return {
      el,
      lut,
      vridTak: Math.max(4, Math.abs(lut) * KORT.vridTakFaktor),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      inne: false,
      vila: null,
      sistX: 0,
      sistY: 0,
      dx: 0,
      dy: 0,
      sist: ''
    };
  });

  /* TRÄFFYTAN ÄR KORTETS VILOLÄGE, INTE KORTET.

     Första bygget lyssnade på pointerenter och pointerleave på kortet
     självt. Det kan inte fungera: kortet flyttar sig under pekaren,
     så träffytan rör sig medan man är inne i den. Uppmätt vid en
     långsam passage tvärs över ett kort — SEX inträden och FEM
     utträden, alltså fem kast och fem återfångster på en enda
     rörelse. Kortet skakade i stället för att följa.

     Värre: kortet kunde äta upp pekaren. Flyttar det sig åt samma
     håll som pekaren är på väg ut täcker det utgången, sista
     händelsen blir ett INTRÄDE, och då står kortet kvar för alltid.
     Uppmätt slutläge efter en passage: x = 64, alltså parkerat på
     klämgränsen utan väg hem.

     Nu ligger lyssnarna på kortets FÖRÄLDER, som står stilla, och
     träffprovet görs mot kortets viloruta som vi räknar ut själva:
     nuvarande ruta minus den förflyttning vi lagt på. Rutan lagras i
     dokumentkoordinater, så den överlever att man scrollar medan man
     hovrar. Kortet kan då inte påverka sin egen träffyta, och in och
     ut blir ett av varje. */
  const slappKort = (k) => {
    k.inne = false;
    // Kastet ärver pekarens rörelse i utträdesögonblicket.
    k.vx = k.dx * KORT.kastFart;
    k.vy = k.dy * KORT.kastFart;
  };

  for (const k of spar) {
    const vard = k.el.parentElement || k.el;

    const matVila = () => {
      const r = k.el.getBoundingClientRect();
      k.vila = {
        l: r.left + window.scrollX - k.x,
        t: r.top + window.scrollY - k.y,
        b: r.width,
        h: r.height
      };
    };

    vard.addEventListener('pointerenter', matVila);

    vard.addEventListener('pointermove', (e) => {
      if (!k.vila) matVila();
      const px = e.clientX + window.scrollX;
      const py = e.clientY + window.scrollY;
      const inne =
        px >= k.vila.l && px <= k.vila.l + k.vila.b &&
        py >= k.vila.t && py <= k.vila.t + k.vila.h;

      if (inne && !k.inne) {
        k.inne = true;
        k.sistX = e.clientX;
        k.sistY = e.clientY;
        k.dx = 0;
        k.dy = 0;
        k.el.style.willChange = 'transform';
        return;
      }
      if (!inne) {
        if (k.inne) slappKort(k);
        return;
      }

      k.dx = e.clientX - k.sistX;
      k.dy = e.clientY - k.sistY;
      k.sistX = e.clientX;
      k.sistY = e.clientY;
      k.x = klamp(k.x + k.dx * KORT.folj, KORT.tak);
      k.y = klamp(k.y + k.dy * KORT.folj, KORT.tak);
    });

    vard.addEventListener('pointerleave', () => {
      if (k.inne) slappKort(k);
    });
  }

  varvSteg.push((nu, dt) => {
    if (flikenDold) return;
    const steg = Math.min(dt, 34) / 1000;

    for (const k of spar) {
      if (!k.inne && !k.x && !k.y && !k.vx && !k.vy) {
        /* Vilande kort ska inte ligga kvar som ett eget lager.
           will-change tas bort här och inte bara i insomningsgrenen:
           uppmätt blev den kvar på 'transform' efter en passage,
           eftersom kortet kunde nå exakt noll utan att passera genom
           den grenen. Sex kort med varsitt onödigt lager är sex lager
           för mycket på en sida som redan komponerar mycket. */
        if (k.el.style.willChange) k.el.style.willChange = '';
        continue;
      }

      if (!k.inne) {
        /* Motståndet drar ned farten, fjädern drar hem kortet. Samma
           bromsformel som jongleringens fria kast. */
        const broms = Math.max(0, 1 - (KORT.motstand / 1000) * steg * 6);
        k.vx = (k.vx + (-KORT.fjaderK * k.x - KORT.fjaderD * k.vx) * steg) * broms;
        k.vy = (k.vy + (-KORT.fjaderK * k.y - KORT.fjaderD * k.vy) * steg) * broms;
        k.x += k.vx * steg;
        k.y += k.vy * steg;

        // Nära nog hemma: lägg ned det exakt och sluta räkna.
        if (Math.abs(k.x) < 0.2 && Math.abs(k.y) < 0.2 &&
            Math.abs(k.vx) < 1 && Math.abs(k.vy) < 1) {
          k.x = 0; k.y = 0; k.vx = 0; k.vy = 0;
          k.el.style.willChange = '';
        }
      }

      const vrid = klamp(k.x * KORT.vridPerPx, k.vridTak);
      const d = `translate3d(${k.x.toFixed(1)}px, ${k.y.toFixed(1)}px, 0) rotate(${vrid.toFixed(2)}deg)`;
      if (d === k.sist) continue;
      k.sist = d;
      k.el.style.transform = d;
    }
  });
}

/* ═══ 5 · FINALEN ════════════════════════════════════════════════
   Märket monteras av sina egna delar när sektionen kommer i vy.
   All timing ligger i stilmallen; det här är bara avtryckaren.

   UTGÅNGSLÄGET SÄTTS HÄRIFRÅN. Låg det i CSS skulle en besökare
   utan JS få en tom ruta där loggan ska stå. Nu är ordningen den
   omvända: utan JS står märket färdigt, och JS är det som gör det
   omonterat för att kunna montera det.

   EN GÅNG PER SIDLADDNING. Observatören kopplas ned i samma andetag
   som den utlöser. Att bygga om märket varje gång någon passerar
   förbi är det som gör scrollutlösta effekter irriterande andra
   gången — och det här är sidans sista ögonblick, inte en kontroll
   man återvänder till.                                            */

function riggaFinal() {
  const sek = $('#final');
  if (!sek) return;

  /* Hälsningen behöver ingen förberedelse längre. Den var satt text
     som delades i ord och bokstäver härifrån; nu är den en bild som
     ligger färdig i uppmärkningen och sätts dit av stilmallen. */
  sek.setAttribute('data-bygger', 'vantar');

  const io = new IntersectionObserver(
    ([post]) => {
      if (!post.isIntersecting) return;
      io.disconnect();
      sek.setAttribute('data-bygger', 'kor');
    },
    /* SEKVENSEN ÄR 3,5 SEKUNDER LÅNG: 3140 ms montering plus 380 ms
       för hälsningen som sätts dit. Då räcker det inte att sektionen
       nätt och jämnt kommit in i vyn — då hinner den spelas färdigt
       medan besökaren fortfarande scrollar förbi.

       -40 % i underkant betyder att märket börjar byggas först när
       sektionens överkant passerat 60 procent av skärmhöjden, alltså
       när den fyller en dryg tredjedel av vyn.

       threshold 0 och inte ett tal, med flit. Ett tröskelvärde mäts
       mot SEKTIONENS höjd, och den här sektionen är högre än en låg
       vy: vid 560 px vyhöjd kom man aldrig upp i 25 procent av den.
       Noll mäter bara om något alls är inne i den krympta rutan, och
       det går att uppfylla oavsett hur hög sektionen är. */
    { rootMargin: '0px 0px -40% 0px', threshold: 0 }
  );
  io.observe(sek);
}

/* ═══ MJUK SCROLL ════════════════════════════════════════════════ */

function riggaLenis() {
  if (reducerad.matches) return;
  const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
  // Lenis körde ett eget rAF-varv vid sidan av sajtens. Två varv som
  // båda vill äga bildrutan är ett varv för mycket, och det var Lenis
  // varv som avgjorde när scrollvärdet var färdigt — alltså läste
  // sajtens varv ibland ett halvuppdaterat läge. Nu ligger den först
  // i det enda varvet.
  varvSteg.unshift((nu) => lenis.raf(nu));
}

/* ═══ START ══════════════════════════════════════════════════════ */

fyllStatus();
fyllKontakt();
byggSignaturer();
byggMeny();
forberedStickers();
riggaOrderbar();

// Momenten registrerar sina varvsteg FÖRE riggaScroll, som startar
// varvet. Registreras de efter kör första bildrutan utan dem.
riggaVagor();
riggaFoton();
riggaFotokort();
riggaFinal();
riggaAvskalning();
riggaBlick();
riggaGlans();
riggaJonglering();
riggaNav();
riggaKedja();
riggaPuls();
const slappHeroburgaren = riggaHeroburgare();

riggaLenis();
riggaScroll();
riggaSekvens();

// Öppettidsstatusen räknas om varje minut.
setInterval(fyllStatus, 60_000);

// Avslöjningen startar när laddskärmen släppt. Hoppas den över
// löser löftet direkt och avslöjningen körs på en gång.
//
// Märkena observeras vid samma tillfälle, inte tidigare. Observatören
// låg förut på modulnivå och klockan i hero är synlig från första
// bildrutan — den satte sig alltså på plats bakom laddskärmen, och när
// skärmen lyfte stod den redan där. Rubrikens ord avslöjades ett i
// taget medan märket bredvid aldrig anlände. Nu landar de i samma
// ögonblick.
startaLaddskarm().then(() => {
  riggaAvslojning();
  riggaRadavslojning();
  riggaStickers();
  // Hjälteburgarens entré hör till samma ögonblick som rubrikens ord.
  if (slappHeroburgaren) slappHeroburgaren();
});

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

  const hoppaOver =
    reducerad.matches || sessionStorage.getItem('delens-sedd') === '1';

  if (hoppaOver) {
    el.setAttribute('data-klar', 'true');
    el.setAttribute('aria-hidden', 'true');
    return Promise.resolve();
  }

  return new Promise((klar) => {
    const start = performance.now();
    const steg =
      (LADD_TAK_MS - LADD_SLUTSPEL_MS) / (laddEtapper.length - 1);

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
        text.textContent = rad;
        slappLager(i);
        // Sista lagret landar: hela stapeln stukas och reser sig.
        if (i === laddEtapper.length - 1) setTimeout(stukaStapeln, 300);
      }, steg * i);
    });

    const tick = () => {
      const gatt = performance.now() - start;
      fyll.style.width = Math.min(100, (gatt / LADD_TAK_MS) * 100) + '%';
      if (gatt < LADD_TAK_MS) {
        requestAnimationFrame(tick);
      } else {
        el.setAttribute('data-klar', 'true');
        el.setAttribute('aria-hidden', 'true');
        sessionStorage.setItem('delens-sedd', '1');
        klar();
      }
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
     lagerscenen, där de visas 500 px breda. I en knut på 30 px blev de
     färgfläckar. Ingredienserna är frilagda och fotade något uppifrån
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

/* ═══ 4 · LAGERSEKTIONEN + SCROLLVARVET ══════════════════════════ */

/* LÅSTA. Framreglade i avstämningspanelen och fastställda; panelen
   är borttagen och de här två talen ändras inte längre av ett
   reglage utan av ett beslut. */
const scenLage = {
  maxVrid: 7, // grader
  sep: 1.6 // multiplikator på lagrens fart
};

function riggaScroll() {
  const spar = $('#lager-spar');
  const scen = $('#lager-scen');
  const bitar = $$('.lager__bit');
  const nav = $('#nav');

  // Djupled så vridningen läser som volym och inte som papp.
  const djup = [40, 20, 0, -20, -40];

  let progress = 0;
  let behovsRitning = true;

  const las = () => {
    const r = spar.getBoundingClientRect();
    const strackan = spar.offsetHeight - window.innerHeight;
    progress = strackan > 0 ? Math.min(1, Math.max(0, -r.top / strackan)) : 0;
    behovsRitning = true;
  };

  const rita = () => {
    if (!behovsRitning) return;
    behovsRitning = false;

    if (!reducerad.matches) {
      const h = scen.offsetHeight || 1;

      bitar.forEach((bit, i) => {
        const fart = parseFloat(bit.dataset.fart) || 0;
        const y = fart * progress * h * scenLage.sep;
        bit.style.transform = `translate3d(0, ${y.toFixed(1)}px, ${djup[i]}px)`;
      });

      scen.style.transform = `rotateY(${(progress * scenLage.maxVrid).toFixed(2)}deg)`;
    }

    nav.setAttribute('data-fast', String(window.scrollY > 40));
  };

  // Ett varv för allt scrollstyrt OCH för all löpande rörelse. Varje
  // ny effekt registrerar sig i varvSteg i stället för att starta ett
  // eget varv — åtta rAF-loopar hade konkurrerat om samma bildruta.
  let forra = performance.now();
  const varv = (nu) => {
    const dt = Math.min(64, nu - forra); // hoppa inte vid flikbyte
    forra = nu;
    rita();
    for (const steg of varvSteg) steg(nu, dt);
    requestAnimationFrame(varv);
  };

  window.addEventListener('scroll', las, { passive: true });
  window.addEventListener('resize', las, { passive: true });
  las();
  requestAnimationFrame(varv);
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

/**
 * Delar raden i ord och ord i bokstäver.
 *
 * TVÅ NIVÅER, INTE EN. Bara bokstäver hade räckt för animationen men
 * inte för radbrytningen: en radbrytning får ske mellan två
 * inline-block, så "Välkommen" hade kunnat brytas mitt i på en smal
 * skärm. Orden håller ihop sina bokstäver, mellanrummen mellan orden
 * är riktiga textnoder, och raden bryts där svenskan säger.
 *
 * DEN RIKTIGA TEXTEN LIGGER KVAR, dold för ögat men läsbar för
 * skärmläsare och sidsökning. Bokstavsspannen är aria-hidden — en
 * text som delats i 25 element läses i värsta fall upp bokstav för
 * bokstav, och "V-Ä-L-K-O-M-M-E-N" är inte en hälsning.
 */
function delaRadIBokstaver(rad) {
  const text = rad.textContent.trim();
  rad.textContent = '';

  const dold = document.createElement('span');
  dold.className = 'visuellt-dold';
  dold.textContent = text;
  rad.appendChild(dold);

  const bygge = document.createElement('span');
  bygge.setAttribute('aria-hidden', 'true');

  const ord = text.split(' ');
  let i = 0;
  ord.forEach((o, oi) => {
    const span = document.createElement('span');
    span.className = 'final__ord';
    for (const tecken of o) {
      const b = document.createElement('span');
      b.className = 'final__bokstav';
      b.style.setProperty('--i', i++);
      b.textContent = tecken;
      span.appendChild(b);
    }
    bygge.appendChild(span);
    if (oi < ord.length - 1) bygge.appendChild(document.createTextNode(' '));
  });

  rad.appendChild(bygge);
  return i;
}

function riggaFinal() {
  const sek = $('#final');
  if (!sek) return;

  // Vid reducerad rörelse delas raden inte alls. Den står som den
  // står i uppmärkningen och tonas in med resten av blocket.
  if (!reducerad.matches) delaRadIBokstaver($('.final__rad', sek));

  sek.setAttribute('data-bygger', 'vantar');

  const io = new IntersectionObserver(
    ([post]) => {
      if (!post.isIntersecting) return;
      io.disconnect();
      sek.setAttribute('data-bygger', 'kor');
    },
    /* SEKVENSEN ÄR 4,3 SEKUNDER LÅNG, och då räcker det inte att
       sektionen nätt och jämnt kommit in i vyn — då hinner den
       spelas färdigt medan besökaren fortfarande scrollar förbi.

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
  /* Handtag för att hoppa till exakta scrollägen under bygget. Stod
     förut att det skulle bort med avstämningspanelen; det får stå
     kvar. Panelen var en ruta i vägen, det här är en variabel utan
     avtryck i sidan, och den är enda vägen att styra Lenis utifrån
     när ett läge behöver mätas. Bort vid skarp lansering. */
  window.__lenis = lenis;
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

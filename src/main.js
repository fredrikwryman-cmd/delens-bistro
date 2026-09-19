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
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ═══ 0 · LADDSKÄRM ══════════════════════════════════════════════
   Ger sig efter 1,8 s oavsett. Hoppas över vid återbesök i samma
   session och vid reducerad rörelse. Se PLAN.md avsnitt 9.        */

const LADD_TAK_MS = 1800;

const laddEtapper = [
  'Värmer plåten …',
  'Smashar köttet …',
  'Smälter cheddarn …',
  'Lägger salladen …',
  'Serverar!'
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
    const steg = LADD_TAK_MS / laddEtapper.length;

    laddEtapper.forEach((rad, i) => {
      setTimeout(() => {
        text.textContent = rad;
        if (delar[i]) delar[i].setAttribute('data-syns', 'true');
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
  satt('#hitta-karta', (el) => (el.href = kartlank));

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
  for (const sel of ['#bestall-lank', '#orderbar-lank']) {
    satt(sel, (el) => (el.href = kontakt.bestall));
  }

  fyllTider($('#hitta-tider'));
  fyllTider($('#foot-tider'));
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
   Listan är en lista. Rätter som har ett foto får en markör och kan
   fällas ut; raden blir då en mörk lucka i det ljusa blocket. Ett
   öppet i taget per kategori, precis som dragspelets kort, och
   första rätten med bild står öppen från start.

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
          const pris = `<span class="ratt__pris">${r.pris} kr</span>`;
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
                ${namn}<span class="ratt__prickar" aria-hidden="true"></span>${pris}
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
                  ${namn}<span class="ratt__prickar" aria-hidden="true"></span>${pris}
                  <span class="ratt__markor" aria-hidden="true"></span>
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

  const oppna = (li) => {
    const lista = li.closest('.ratter');
    for (const annan of $$('.ratt--bild[data-oppen="true"]', lista)) {
      if (annan === li) continue;
      annan.dataset.oppen = 'false';
      annan.querySelector('.ratt__knapp').setAttribute('aria-expanded', 'false');
    }
    const nu = li.dataset.oppen !== 'true';
    li.dataset.oppen = String(nu);
    li.querySelector('.ratt__knapp').setAttribute('aria-expanded', String(nu));
    if (nu) ladda(li);
  };

  paneler.addEventListener('click', (e) => {
    const knapp = e.target.closest('.ratt__knapp');
    if (knapp) oppna(knapp.closest('.ratt--bild'));
  });

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

function riggaStickers() {
  const hero = $('#hero');
  if (!hero) return;
  new IntersectionObserver(
    ([post]) => hero.setAttribute('data-synlig', String(post.isIntersecting)),
    { threshold: 0 }
  ).observe(hero);
}

/* ═══ 4 · LAGERSEKTIONEN + SCROLLVARVET ══════════════════════════ */

const scenLage = {
  maxVrid: 33, // grader
  sep: 1.0 // multiplikator på lagrens fart
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
    matUppdatera(progress);
  };

  // Ett varv för allt scrollstyrt.
  const varv = () => {
    rita();
    requestAnimationFrame(varv);
  };

  window.addEventListener('scroll', las, { passive: true });
  window.addEventListener('resize', las, { passive: true });
  las();
  requestAnimationFrame(varv);
}

/* ═══ AVSTÄMNINGSPANEL ═══════════════════════════════════════════
   Byggverktyg. Tas bort när rörelsen är låst.                     */

let matEl = null;

function riggaMatpanel() {
  if (new URLSearchParams(location.search).has('ren')) return;

  const panel = $('#matpanel');
  panel.hidden = false;

  matEl = {
    progress: $('#m-progress'),
    vrid: $('#m-vrid'),
    sep: $('#m-sep')
  };

  const vridReg = $('#m-vrid-reg');
  const sepReg = $('#m-sep-reg');

  vridReg.addEventListener('input', () => {
    scenLage.maxVrid = +vridReg.value;
    $('#m-vrid-ut').textContent = vridReg.value + '°';
  });

  sepReg.addEventListener('input', () => {
    scenLage.sep = +sepReg.value / 10;
    $('#m-sep-ut').textContent = scenLage.sep.toFixed(1).replace('.', ',') + '×';
  });
}

function matUppdatera(p) {
  if (!matEl) return;
  const h = $('#lager-scen')?.offsetHeight || 0;
  matEl.progress.textContent = Math.round(p * 100) + ' %';
  matEl.vrid.textContent = (p * scenLage.maxVrid).toFixed(1) + '°';
  matEl.sep.textContent = Math.round(0.4 * p * h * scenLage.sep) + ' px';
}

/* ═══ MJUK SCROLL ════════════════════════════════════════════════ */

function riggaLenis() {
  if (reducerad.matches) return;
  const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
  // Exponeras under bygget så rörelsen går att hoppa till exakta lägen.
  // Tas bort tillsammans med avstämningspanelen.
  window.__lenis = lenis;
  const varv = (t) => {
    lenis.raf(t);
    requestAnimationFrame(varv);
  };
  requestAnimationFrame(varv);
}

/* ═══ START ══════════════════════════════════════════════════════ */

fyllStatus();
fyllKontakt();
byggSignaturer();
byggMeny();
riggaStickers();
riggaMatpanel();
riggaScroll();
riggaLenis();

// Öppettidsstatusen räknas om varje minut.
setInterval(fyllStatus, 60_000);

// Avslöjningen startar när laddskärmen släppt. Hoppas den över
// löser löftet direkt och avslöjningen körs på en gång.
startaLaddskarm().then(riggaAvslojning);

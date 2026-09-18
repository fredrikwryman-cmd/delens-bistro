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

/* ═══ 5 · SIGNATURBURGARNA ═══════════════════════════════════════ */

function byggSignaturer() {
  const lutningar = [-2.5, 3, -1.5, 2.5, -3];
  $('#signatur-lista').innerHTML = signaturer
    .map(
      (b, i) => `
      <li class="burgarkort" style="--lut: ${lutningar[i]}deg">
        <span class="ph" style="--ar: 1 / 1" data-id="${b.id}" data-spec="1200 × 1200 · PNG α"></span>
        <h3 class="burgarkort__namn">${b.namn}</h3>
        <p class="burgarkort__pris">${b.pris} kr</p>
        <p class="burgarkort__pitch">${b.pitch}</p>
      </li>`
    )
    .join('');
}

/* ═══ 6 · MENYN ══════════════════════════════════════════════════ */

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
    .map(
      (k, i) => `
      <div class="meny__panel" role="tabpanel" id="panel-${k.id}"
           aria-labelledby="flik-${k.id}" ${i === 0 ? '' : 'hidden'}>
        ${k.underrubrik ? `<p class="meny__underrubrik">${k.underrubrik}</p>` : ''}
        <ul class="ratter">
          ${k.ratter
            .map(
              (r) => `
            <li class="ratt${r.signatur ? ' ratt--signatur' : ''}">
              <div class="ratt__rad">
                <span class="ratt__namn">${r.namn}</span>
                <span class="ratt__prickar"></span>
                <span class="ratt__pris">${r.pris} kr</span>
              </div>
              ${r.innehall ? `<p class="ratt__innehall">${r.innehall}</p>` : ''}
            </li>`
            )
            .join('')}
        </ul>
      </div>`
    )
    .join('');

  const knappar = $$('.flik', flikar);

  const visa = (id) => {
    knappar.forEach((b) => {
      const vald = b.id === `flik-${id}`;
      b.setAttribute('aria-selected', String(vald));
      b.tabIndex = vald ? 0 : -1;
    });
    $$('.meny__panel', paneler).forEach((p) => {
      p.hidden = p.id !== `panel-${id}`;
    });
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

  for (const el of mal) {
    const ord = el.textContent.trim().split(/\s+/);
    el.innerHTML = ord.map((o) => `<span class="ord">${o}</span>`).join(' ');
  }

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

/* ═══ 4 · LAGERSEKTIONEN + SCROLLVARVET ══════════════════════════ */

const scenLage = {
  maxVrid: 18, // grader
  sep: 0.7 // multiplikator på lagrens fart
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
riggaMatpanel();
riggaScroll();
riggaLenis();

// Öppettidsstatusen räknas om varje minut.
setInterval(fyllStatus, 60_000);

// Avslöjningen startar när laddskärmen släppt. Hoppas den över
// löser löftet direkt och avslöjningen körs på en gång.
startaLaddskarm().then(riggaAvslojning);

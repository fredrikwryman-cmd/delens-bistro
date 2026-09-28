/**
 * Menyassistenten — panelen.
 *
 * Hämtas med import() från riggaAssistent() i main.js, först när
 * någon trycker på Fråga kocken. Ingenting härifrån ligger i startpaketet,
 * inte heller stilarna: assistent.css importeras här, och Vite lägger
 * den i samma utbrutna bit.
 *
 * RÖRELSEN RÖR INTE SIDANS VARV. Panelen glider in med en CSS-
 * övergång på transform och opacity. Inget eget requestAnimationFrame,
 * ingen scroll av sidan: fokus flyttas med preventScroll, och panelen
 * bär data-lenis-prevent så att hjulet inuti den rullar samtalet och
 * inte sidan bakom.
 *
 * Samtalet lever bara i den här fliken. Det skickas om i sin helhet
 * vid varje fråga — servern minns ingenting — och backend klipper
 * det till de senaste tolv meddelandena.
 */

import './assistent.css';
import { kontakt } from './data/menu.js';

/* Vercel-projektets adress. Byts via VITE_ASSISTENT_URL vid lokal
   utveckling; i den publicerade sajten gäller förvalet. */
const ADRESS =
  import.meta.env.VITE_ASSISTENT_URL ||
  'https://delens-assistent.vercel.app/api/assistent';

const TIDSGRANS_MS = 30_000;
const MAX_TECKEN = 600;

/* Knappen i ett svar får bara leda till beställningssidan. Adressen
   kommer från backend, som har den som konstant, men sidan litar
   ändå inte blint på det som kommer över nätet. */
const QOPLA = /^https:\/\/qopla\.com\//;

const HALSNING =
  'Hej! Fråga mig om menyn, priserna eller öppettiderna. Allergier tar du med personalen i restaurangen.';

let panel = null;
let logg = null;
let falt = null;
let skicka = null;
let utlosare = null;
let upptagen = false;

/** Samtalet, i den form backend tar emot. */
const samtal = [];

/* ── Byggnaden ──────────────────────────────────────────────────── */

function el(tagg, klass, text) {
  const e = document.createElement(tagg);
  if (klass) e.className = klass;
  if (text != null) e.textContent = text;
  return e;
}

function bygg() {
  panel = el('aside', 'assistent');
  panel.id = 'assistent';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'false');
  panel.setAttribute('aria-labelledby', 'assistent-rubrik');
  panel.setAttribute('data-lenis-prevent', '');

  const topp = el('div', 'assistent__topp');
  const rubrik = el('h2', 'assistent__rubrik', 'Fråga kocken');
  rubrik.id = 'assistent-rubrik';
  const stang = el('button', 'assistent__stang');
  stang.type = 'button';
  stang.setAttribute('aria-label', 'Stäng');
  stang.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>';
  stang.addEventListener('click', stangPanel);
  topp.append(rubrik, stang);

  const not = el(
    'p',
    'assistent__not',
    'Svaren skrivs av en AI och kan bli fel. Priser och tider gäller som på menyn.'
  );

  logg = el('ol', 'assistent__logg');
  logg.setAttribute('role', 'log');
  logg.setAttribute('aria-live', 'polite');
  logg.setAttribute('aria-label', 'Samtal');
  logg.append(rad('assistent', HALSNING));

  const form = el('form', 'assistent__form');
  const etikett = el('label', 'visuellt-dold', 'Din fråga');
  etikett.htmlFor = 'assistent-falt';
  falt = el('input', 'assistent__falt');
  falt.id = 'assistent-falt';
  falt.type = 'text';
  falt.maxLength = MAX_TECKEN;
  falt.autocomplete = 'off';
  falt.enterKeyHint = 'send';
  falt.placeholder = 'Skriv din fråga';
  skicka = el('button', 'knapp assistent__skicka', 'Skicka');
  skicka.type = 'submit';
  form.append(etikett, falt, skicka);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    fraga();
  });

  panel.append(topp, not, logg, form);
  document.body.append(panel);
}

/** En rad i samtalet. Texten sätts alltid som text, aldrig som HTML. */
function rad(vem, text, knapp) {
  const li = el('li', `assistent__rad assistent__rad--${vem}`);
  li.append(el('p', 'assistent__bubbla', text));
  if (knapp) li.append(knapp);
  return li;
}

function visa(li) {
  logg.append(li);
  // Nya rader längst ned; loggen rullas dit direkt, utan animering —
  // det är innehållet som rör sig in, inte vyn som far iväg.
  logg.scrollTop = logg.scrollHeight;
}

/* ── Öppna och stänga ───────────────────────────────────────────── */

function vidTangent(e) {
  if (e.key === 'Escape' && panel?.getAttribute('data-oppen') === 'true') {
    e.preventDefault();
    stangPanel();
  }
}

export function oppna(knapp) {
  utlosare = knapp;
  const forsta = !panel;
  if (forsta) bygg();
  if (panel.getAttribute('data-oppen') === 'true') {
    falt.focus({ preventScroll: true });
    return;
  }

  /* Första gången finns panelen inte i något stängt läge att gå ifrån:
     den skapades nyss. Läsningen av måtten tvingar webbläsaren att
     räkna ut det stängda läget innan det öppna sätts, så att
     övergången har en början. Utan den står panelen bara där. */
  if (forsta) panel.getBoundingClientRect();

  panel.setAttribute('data-oppen', 'true');
  utlosare.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', vidTangent);
  falt.focus({ preventScroll: true });
}

function stangPanel() {
  if (!panel) return;
  panel.setAttribute('data-oppen', 'false');
  utlosare?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('keydown', vidTangent);
  utlosare?.focus({ preventScroll: true });
}

/* ── Samtalet ───────────────────────────────────────────────────── */

async function fraga() {
  const text = falt.value.trim().slice(0, MAX_TECKEN);
  if (!text || upptagen) return;

  upptagen = true;
  skicka.disabled = true;
  falt.value = '';
  samtal.push({ roll: 'kund', text });
  visa(rad('kund', text));

  const vantar = rad('assistent', 'Kocken tänker …');
  vantar.classList.add('assistent__rad--vantar');
  visa(vantar);

  const avbryt = new AbortController();
  const timer = setTimeout(() => avbryt.abort(), TIDSGRANS_MS);

  try {
    const svar = await fetch(ADRESS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meddelanden: samtal }),
      signal: avbryt.signal
    });
    const data = await svar.json().catch(() => null);
    const message = typeof data?.message === 'string' ? data.message : '';
    if (!message) throw new Error(`svar ${svar.status}`);

    let knapp = null;
    if (svar.ok && data.button_text && QOPLA.test(data.qopla_url ?? '')) {
      knapp = el('a', 'knapp assistent__bestall', data.button_text);
      knapp.href = data.qopla_url;
      knapp.target = '_blank';
      knapp.rel = 'noopener';
    }

    vantar.remove();
    visa(rad('assistent', message, knapp));

    // Bara riktiga svar går in i historiken. Ett felmeddelande som
    // skickades tillbaka som modellens eget svar vore en lögn i
    // nästa fråga.
    if (svar.ok) samtal.push({ roll: 'assistent', text: message });
    else samtal.pop();
  } catch {
    samtal.pop();
    vantar.remove();
    const fel = rad(
      'assistent',
      `Jag kommer inte fram just nu. Försök igen om en stund, eller ring oss på ${kontakt.telefon}.`
    );
    fel.classList.add('assistent__rad--fel');
    visa(fel);
  } finally {
    clearTimeout(timer);
    upptagen = false;
    skicka.disabled = false;
    // Fokus står kvar i fältet efter svaret, bara om panelen är öppen.
    if (panel.getAttribute('data-oppen') === 'true') {
      falt.focus({ preventScroll: true });
    }
  }
}

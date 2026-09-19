/**
 * Dokumentsidor — integritetspolicyn och det som kommer efter den.
 *
 * Startsidans main.js bygger meny, dragspel, lagerscen, pekarkedja och
 * ett rAF-varv för alla tre löpande animationerna. Ingenting av det
 * finns på en textsida, och att ladda 87 kB för att fylla i ett
 * telefonnummer vore slöseri. Den här filen gör de två saker en
 * dokumentsida faktiskt behöver.
 */

import { kontakt } from './data/menu.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Kontaktuppgifterna kommer från samma källa som startsidan. Skrivna
   för hand på två ställen blir de olika vid första ändringen, och på
   en integritetspolicy är fel telefonnummer ett riktigt fel — det är
   den vägen man ska kunna utöva sina rättigheter. */
const tel = $('#pol-tel');
if (tel) {
  tel.href = kontakt.telefonLank;
  tel.textContent = kontakt.telefon;
}

const epost = $('#pol-epost');
if (epost) {
  epost.href = 'mailto:' + kontakt.epost;
  epost.textContent = kontakt.epost;
}

/* Navbaren viker undan vid nedscroll, precis som på startsidan. Här
   räcker en scroll-lyssnare: sidan har inget varv att haka i, och att
   starta ett rAF-varv för en enda avläsning vore att betala för något
   som inte används. */
const nav = $('#nav');
if (nav) {
  let sist = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      const delta = y - sist;
      if (Math.abs(delta) < 6) return;
      sist = y;
      nav.setAttribute('data-undan', String(delta > 0 && y > 40));
      nav.setAttribute('data-fast', String(y > 40));
    },
    { passive: true }
  );
}

/* data-reveal och data-rader finns i uppmärkningen för att sidan ska
   se ut som resten av sajten. Utan JS som plockar upp dem står texten
   bara still — vilket är rätt utgångsläge: innehållet syns alltid,
   rörelsen är det som är valfritt. */
for (const el of $$('[data-rader], [data-reveal]')) {
  el.removeAttribute('data-rader');
  el.removeAttribute('data-reveal');
}

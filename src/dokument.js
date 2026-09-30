/**
 * Dokumentsidor — integritetspolicyn och det som kommer efter den.
 *
 * Startsidans main.js bygger meny, dragspel, lagerscen, pekarkedja och
 * ett rAF-varv för alla tre löpande animationerna. Ingenting av det
 * finns på en textsida, och att ladda 87 kB för en navbar vore slöseri.
 * Den här filen gör det lilla en dokumentsida faktiskt behöver.
 */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* Kontaktuppgifterna står i HTML:en. Vite skriver in dem ur menu.js vid
   bygget (verktyg/statisk.mjs), så de har samma källa som startsidan
   utan att sidan behöver hämta menydatan. */

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

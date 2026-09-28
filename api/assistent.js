/**
 * Menyassistenten — serverless-funktion på Vercel.
 *
 *   POST /api/assistent   { meddelanden: [{ roll, text }, …] }
 *   →                     { message, qopla_url, button_text }
 *
 * Sajten ligger på GitHub Pages, som inte kör kod. Den här filen är
 * det enda som körs på Vercel; se vercel.json. Nyckeln läses ur
 * miljövariabeln ANTHROPIC_API_KEY, som sätts i Vercels projekt-
 * inställningar. Den står aldrig i repot — repot är publikt.
 *
 * MENYN, ÖPPETTIDERNA OCH ADRESSEN LÄSES UR SAJTENS EGEN DATAFIL.
 * src/data/menu.js är samma fil som bygger menyn på sidan. Ändras ett
 * pris där ändras det här vid nästa publicering, och ingenting står
 * på två ställen.
 */

import Anthropic from '@anthropic-ai/sdk';
import { kategorier, oppettider, kontakt } from '../src/data/menu.js';

/* ── Konstanter ─────────────────────────────────────────────────── */

/** Beställningslänken. Modellen ser den aldrig och kan inte ändra
    den — den läggs på svaret här, efter att modellen svarat. */
const QOPLA_URL = kontakt.bestall;

const MODELL = 'claude-opus-5';

/** Varifrån sidan får anropa. Allt annat får inget CORS-svar. */
const TILLATNA_URSPRUNG = new Set([
  'https://delens.aimstudios.se',
  'http://localhost:5391',
  'http://localhost:5173'
]);

/* Takbegränsning. Se begransa() för vad den klarar och inte. */
const PER_BESOKARE_KORT = { antal: 12, fonster: 10 * 60 * 1000 };
const PER_BESOKARE_DAG = { antal: 60, fonster: 24 * 60 * 60 * 1000 };
const PER_INSTANS_DAG = 600;

/* Storleksgränser på det som skickas in. Samtalet skickas om i sin
   helhet varje gång, så historiken måste ha ett tak — annars växer
   kostnaden per fråga med samtalets längd. */
const MAX_MEDDELANDEN = 12;
const MAX_TECKEN = 600;

/* ── Systemprompten ─────────────────────────────────────────────── */

function menyText() {
  return kategorier
    .map((k) => {
      const rubrik = k.underrubrik
        ? `## ${k.namn} (priser: ${k.underrubrik.toLowerCase()})`
        : `## ${k.namn}`;
      const rader = k.ratter.map((r) => {
        const innehall = r.innehall ? ` — ${r.innehall}` : '';
        return `- ${r.namn}: ${r.pris} kr${innehall}`;
      });
      return [rubrik, ...rader].join('\n');
    })
    .join('\n\n');
}

function tiderText() {
  // Datafilen börjar på söndag, som Date.getDay(). Här skrivs veckan
  // från måndag, som en människa läser den.
  return [1, 2, 3, 4, 5, 6, 0]
    .map((i) => `- ${oppettider[i].dag}: ${oppettider[i].fran}–${oppettider[i].till}`)
    .join('\n');
}

const SYSTEM = `Du är menyassistenten på Delens Bistro, en burgarrestaurang i Upplands Väsby. Du svarar besökare på restaurangens webbplats.

# Ton
Vänlig, saklig och kunnig om maten. Högst tre meningar per svar. Svara på samma språk som kunden skriver på; svenska om det är oklart.

# Regler
- Allt du vet om restaurangen står nedan. Hitta aldrig på rätter, priser, ingredienser, öppettider eller erbjudanden. Står svaret inte här, säg att du inte vet och hänvisa till restaurangen på telefon ${kontakt.telefon}.
- Priser skrivs exakt som i menyn. Två priser betyder två storlekar, enligt kategorins rubrik (till exempel singel / dubbel).
- Ber kunden om tips får du föreslå en burgare och ett tillbehör ur menyn.
- Allergier och specialkost: svara ALDRIG utifrån ingredienslistan, inte ens när svaret verkar uppenbart — listan är inte komplett och kan inte ersätta personalen. Hänvisa alltid till personalen i restaurangen eller telefon ${kontakt.telefon}.
- Du kan inte ta emot beställningar eller bokningar. Beställning sker online via restaurangens beställningssida.
- Frågor som inte handlar om restaurangen svarar du vänligt att du bara kan hjälpa till med Delens Bistro.

# Svarsformat
Svara med JSON enligt schemat.
- message: ditt svar till kunden, vanlig text utan markdown.
- button_text: en kort knapptext, högst fyra ord, till exempel "Beställ online", när kunden vill beställa eller när du föreslagit en rätt. Annars en tom sträng.

# Adress
${kontakt.adress}. Telefon ${kontakt.telefon}.

# Öppettider
${tiderText()}

# Menyn
${menyText()}`;

const SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    button_text: { type: 'string' }
  },
  required: ['message', 'button_text'],
  additionalProperties: false
};

/* ── Takbegränsning ─────────────────────────────────────────────── */

/* I minnet, per instans. Det är det enkla alternativet och det har en
   gräns: Vercel kan köra flera instanser samtidigt, och en instans som
   somnar glömmer sina räknare. Taket per besökare är alltså ett tak
   per besökare OCH instans. Det stoppar en besökare som hamrar på
   knappen, men inte en angripare som sprider sig över instanser.

   Det hårda kostnadstaket sitter därför i Anthropics konsol, som en
   månadsgräns på nyckelns arbetsyta. Se rapporten. */

const besok = new Map();
let instansDag = { start: Date.now(), antal: 0 };

function begransa(ip) {
  const nu = Date.now();

  if (nu - instansDag.start > 24 * 60 * 60 * 1000) {
    instansDag = { start: nu, antal: 0 };
  }
  if (instansDag.antal >= PER_INSTANS_DAG) return false;

  const tider = (besok.get(ip) ?? []).filter((t) => nu - t < PER_BESOKARE_DAG.fonster);
  const senaste = tider.filter((t) => nu - t < PER_BESOKARE_KORT.fonster);
  if (senaste.length >= PER_BESOKARE_KORT.antal) return false;
  if (tider.length >= PER_BESOKARE_DAG.antal) return false;

  tider.push(nu);
  besok.set(ip, tider);
  instansDag.antal++;

  // Kartan får inte växa utan gräns i en långlivad instans.
  if (besok.size > 5000) {
    for (const [nyckel, t] of besok) {
      if (!t.some((x) => nu - x < PER_BESOKARE_DAG.fonster)) besok.delete(nyckel);
    }
  }
  return true;
}

/* ── Indata ─────────────────────────────────────────────────────── */

/** Gör om sidans historik till API:ets format, eller null om den är
    ogiltig. Rollerna måste växla och börja och sluta med kunden. */
function tolka(body) {
  const lista = body?.meddelanden;
  if (!Array.isArray(lista) || lista.length === 0) return null;

  const utdrag = lista.slice(-MAX_MEDDELANDEN);
  // Ett avklippt samtal kan börja med ett svar; kasta det.
  if (utdrag[0]?.roll === 'assistent') utdrag.shift();

  const ut = [];
  for (const m of utdrag) {
    if (typeof m?.text !== 'string') return null;
    const text = m.text.trim().slice(0, MAX_TECKEN);
    if (!text) return null;
    const role = m.roll === 'kund' ? 'user' : m.roll === 'assistent' ? 'assistant' : null;
    if (!role) return null;
    if (ut.length && ut.at(-1).role === role) return null;
    ut.push({ role, content: text });
  }
  if (!ut.length || ut.at(-1).role !== 'user') return null;
  return ut;
}

/** Klockan i Stockholm, så att "har ni öppet nu?" går att besvara. */
function klockan() {
  const f = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
  return f.format(new Date());
}

/* ── Hanteraren ─────────────────────────────────────────────────── */

const klient = new Anthropic();

const SVAR_FEL = {
  message: 'Jag kan tyvärr inte svara just nu. Ring oss gärna på ' + kontakt.telefon + '.',
  qopla_url: QOPLA_URL,
  button_text: ''
};

export default async function handler(req, res) {
  const ursprung = req.headers.origin;
  if (TILLATNA_URSPRUNG.has(ursprung)) {
    res.setHeader('Access-Control-Allow-Origin', ursprung);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ fel: 'Bara POST.' });
  if (!TILLATNA_URSPRUNG.has(ursprung)) return res.status(403).json({ fel: 'Okänt ursprung.' });

  const ip =
    String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'okand';
  if (!begransa(ip)) {
    return res.status(429).json({
      message: 'Du har ställt många frågor på kort tid. Vänta en stund, eller ring oss på ' + kontakt.telefon + '.',
      qopla_url: QOPLA_URL,
      button_text: ''
    });
  }

  const meddelanden = tolka(req.body);
  if (!meddelanden) return res.status(400).json({ fel: 'Ogiltigt samtal.' });

  try {
    const svar = await klient.beta.messages.create({
      model: MODELL,
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: SCHEMA }
      },
      // Menyn först och fast, så att den kan cachas. Klockan ändras
      // varje minut och ligger därför efter, i ett eget block.
      system: [
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `Just nu i Stockholm: ${klockan()}.` }
      ],
      messages: meddelanden
    });

    if (svar.stop_reason === 'refusal') return res.status(200).json(SVAR_FEL);

    const text = svar.content.find((b) => b.type === 'text')?.text;
    const tolkat = JSON.parse(text ?? '');
    const message = typeof tolkat.message === 'string' ? tolkat.message.trim() : '';
    if (!message) return res.status(200).json(SVAR_FEL);

    return res.status(200).json({
      message,
      qopla_url: QOPLA_URL,
      button_text: typeof tolkat.button_text === 'string' ? tolkat.button_text.trim().slice(0, 40) : ''
    });
  } catch (fel) {
    if (fel instanceof Anthropic.RateLimitError) {
      return res.status(503).json(SVAR_FEL);
    }
    console.error('assistent:', fel?.status ?? '', fel?.message ?? fel);
    return res.status(502).json(SVAR_FEL);
  }
}

# Delens Bistro — byggplan

Premium-sajt för Delens Bistro, Centralvägen 3, Upplands Väsby.
Parallellbygge. Ersätter inte delensbistro.se och kopierar den inte.
Visningsprojekt — ingen kund godkänner urval eller form.

Rörelsespråket är hämtat från cravburgers.shop. Koden, strukturen och
formen är egna.

**Status: plan. Ingen kod byggd.**

---

## 1. Stack

| Roll | Val |
|---|---|
| Språk | Vanlig HTML, CSS, JavaScript |
| Byggverktyg | Vite (flera HTML-ingångar, en per sida) |
| Ramverk | Inget |
| Animation | Anime.js v4 för tidslinjer och stagger, ren CSS där det räcker |
| Mjuk scroll | Lenis (~5 kB) — det är den som ger CRAV sin känsla |
| Bildvarianter | Genereras vid bygget, inte i farten |

Ett enda `requestAnimationFrame`-varv driver all scrollstyrd rörelse.
Bara `transform` och `opacity` animeras.

---

## 2. Färg

Mörk grund. Off-white som textfärg — aldrig ren vit.

| Roll | Hex |
|---|---|
| Svart | `#0E0E0E` |
| Kol | `#1A1A1A` |
| Djuprött | `#6B1410` |
| Amber (accent) | `#E8A33D` |
| Off-white (text) | `#F2EBE0` |

Amber bär priser, knappar och det fasta beställningsfältet.

### Sektionsfärger uppifrån

Laddskärmen räknas som första färgblocket. Menyn är enda ljusa blocket.

| # | Sektion | Bakgrund |
|---|---|---|
| 0 | Laddskärm | djuprött |
| 1 | Hero | svart |
| 2 | Öppet nu | kol |
| 3 | Rebranden | djuprött |
| 4 | Lagersektionen | svart |
| 5 | Signaturburgarna | kol |
| 6 | **Hela menyn** | **off-white** |
| 7 | Hitta hit | djuprött |
| 8 | Beställ | svart |
| 9 | Footer | kol |

### Kontrast — mätt, inte gissat

| Kombination | Kvot | Omdöme |
|---|---|---|
| Off-white på svart | 16,3:1 | utmärkt |
| Off-white på djuprött | 10,2:1 | utmärkt |
| Amber på svart | 8,9:1 | utmärkt |
| Amber på djuprött | 5,6:1 | godkänt |
| **Amber på off-white** | **1,8:1** | **underkänt** |

**Konsekvens:** amber får aldrig bära text på det ljusa menyblocket.
Där skrivs priserna i svart. Amber får bara vara fyllning bakom mörk
text, eller en tjock dekorativ kant.

### Två hantverksproblem den mörka paletten skapar

**Vågövergångarna tappar läsbarhet.** Svart mot kol är ett steg på några
procent — vågformen kommer knappt att synas. Lösning: varje våg får en
hårfin amber-kant, 1–2 px, som gör formen läsbar utan att bli dekor.
Övergången till och från det ljusa menyblocket behöver ingen sådan hjälp.

**Frilagda bilder mot nära svart kräver rätt källa.** Ett urklipp som
genererats mot ljus botten får ljus frans i kanten som lyser mot `#0E0E0E`.
Därför måste allt bildmaterial genereras mot **nära svart botten från
början** — det är inte en efterbehandling, det är en del av briefen.

**Loggans röda är inte sektionernas röda.** Loggan bär en ljusare,
mättare röd än `#6B1410`. Den behåller sin egen. Ett märke får ha sin
egen färg; sektionerna anpassar sig inte till den och tvärtom.

---

## 3. Sektionsordning

| # | Sektion | Vad den gör |
|---|---|---|
| 0 | **Laddskärm** | vektorburgaren byggs i fem delar, svensk text per etapp, **max 1,8 s**, hoppas över vid återbesök och vid reducerad rörelse |
| 1 | **Hero** | "DELENS" i konturtyp, burgaren frilagd, "BISTRO" i fylld typ över. Klistermärken SMASHAD / SEDAN 2017. Fast toppnav + **fast beställningsfält i amber nederst** |
| 2 | **Öppet nu** | levande status räknad ur öppettiderna: prick, "Öppet till 20:00" |
| 3 | **Rebranden** | "FRÅN BRUTAL TILL DELENS" ord för ord. Samma ägare, ny partner, smash istället för tjocka puckar |
| 4 | **Lagersektionen** | "VARJE LAGER HANDLAGT" i fyra rader, fem ingrediensurklipp parallaxar invävda i rubriken |
| 5 | **Signaturburgarna** | fem burgare, lutande kort, namn, pris i amber, innehåll |
| 6 | **Hela menyn** | sjuttio rätter med priser, kategorier som flikar. Enda ljusa blocket |
| 7 | **Hitta hit** | streckad linje från Upplands Väsby station till dörren. Karta, adress, öppettider per dag, klickbart telefonnummer |
| 8 | **Beställ** | Qopla, stort |
| 9 | **Footer** | öppettider, adress, telefon, Facebook, utspridda ingrediensurklipp |

---

## 4. Rörelseplan

Samma grammatik som CRAV, egna värden.

- **Ord-för-ord-avslöjning** på alla stora rubriker. Anime.js-tidslinje,
  40–70 ms förskjutning, utlöst av IntersectionObserver
- **Flerhastighetsparallax** i lagersektionen, hastigheter 0,05–0,09 px
  per scrollad pixel, olika per lager
- **Z-index invävt med rubriken** — lagren passerar framför vissa rader
  och bakom andra. Det är hela djupillusionen, inte parallaxen i sig
- **Vågformade SVG-övergångar** mellan färgblock, aldrig raka kanter
- **Lutande kort**, 2–7 graders rotation
- **Klistermärken** med svag idle-wobble
- `prefers-reduced-motion`: parallax av, ord-avslöjning blir enkel
  opacity, laddskärmen hoppas över

**Inga scroll-kapningar.** CRAV nålar aldrig fast och skrollar aldrig
åt användaren. Inte vi heller.

---

## 5. Signaturburgarna — mitt urval

Valt för spridning i pris, hetta och tyngd. Inte de fem dyraste.

| # | Burgare | Pris | Varför |
|---|---|---|---|
| 1 | **Delens Sign.** | 144/179 | bär namnet. Tryffelmajo, parmesan, champinjoner — den premium säger |
| 2 | **Emils Ch. Dlx.** | 149/184 | mest laddad. Dubbel cheddar, smält cheddar, två chilicheese — den mest fotogeniska |
| 3 | **The Beast** | 285 | showstoppern. 4×100 g, högsta prispunkten, den folk fotograferar |
| 4 | **Hot One** | 139/174 | hettan. Jalapeños och picklad chili ger den enda färgkontrasten mot den mörka paletten |
| 5 | **Cheeseburger** | 129/164 | ankaret. Lägsta priset, gör de andra fyra genomtänkta istället för dyra |

**Bortvalda och varför:** Bacon & BBQ överlappar Emils på bacon och
tillför ingen ny axel. Veckans burgare byts löpande och går inte att
fotografera en gång.

**Kebaben finns i menyn (sektion 6) men är inte signaturrätt.**
Den bär en egen kategori med kebabrulle, kebabtallrik och bowls.

---

## 6. CRAV-sektioner som inte går att fylla

| CRAV | Problem | Ersätts med |
|---|---|---|
| Kartsektionen "Quality that travels with you" | London och Berlin. Delens har **en** adress | **Hitta hit** — samma streckade linje som grepp, men från pendeln till dörren |
| "Since 1997" | Delens är januari 2026 under detta namn, 2017 som Brutal Burgers | **Rebrand-historien** — sannare och intressantare |
| Livsstilsbilder från flera städer | Delens har inget sådant bibliotek | **Riktiga bilder från Centralvägen 3.** Hellre färre sektioner än stockfoton |
| Maskoten — tecknade handskar, rörliga ögon | Delens logga är diner och bar, inte tecknad figur | **Utgår.** Klistermärken och konturtypografi räcker |
| Märkta takeaway-förpackningar | Delens förpackningar är omärkta | **Utgår** tills de är märkta |

---

## 7. Bildmaterial

Allt genereras med AI. Undantag: grupp E, som är riktiga foton körda
genom samma verktyg för att matcha ljus och stil.

### Bildstil — gäller allt

Mörk. Hårt sidoljus. Varm ton. **Nära svart bakgrund.**
Samma ljusriktning och samma avstånd genom hela serien.

### Den viktigaste regeln

**Lagren i grupp A genereras inte var för sig.**

Generera **en** hel burgare först. Klyv den sedan i fem lager och måla
igen ytan bakom varje lager. Fem separat genererade ingredienser tillhör
inte samma burgare — de får olika ljus, olika storlek, olika
perspektiv, och glider isär till fem lösa föremål istället för en
burgare som delar sig.

Det var precis det som sänkte förra bildserien: fyra nyckelbilder som
inte delade uppställning.

### A. Lagersektionen — fem lager *(blockerar sektion 4)*

Utgår från **en** genererad källbild. Alfakanal. 1500–2000 px breda.
Ytan bakom varje lager ifylld.

| ID | Lager |
|---|---|
| A0 | Källbild: hela burgaren, mörk, hårt sidoljus, nära svart botten |
| A1 | Överbulle |
| A2 | Cheddar |
| A3 | Köttpuck |
| A4 | Sallad |
| A5 | Underbulle |

### B. Hero *(blockerar sektion 1)*

| ID | Bild |
|---|---|
| B1 | Hela burgaren frilagd mot transparent — kan vara A0 |
| B2 | Samma i porträttbeskärning för mobil |

### C. Signaturburgarna — fem *(blockerar sektion 5)*

Samma vinkel, samma ljus, samma avstånd på alla fem. Frilagda.

| ID | Burgare |
|---|---|
| C1 | Delens Sign. |
| C2 | Emils Ch. Dlx. |
| C3 | The Beast |
| C4 | Hot One |
| C5 | Cheeseburger |

### D. Menykategorier — sex *(blockerar sektion 6)*

| ID | Kategori |
|---|---|
| D1 | Kyckling och vego |
| D2 | Kebabrulle |
| D3 | Bowl |
| D4 | Barnmeny |
| D5 | Tillbehör |
| D6 | Efterrätt |

### E. Lokalen — riktiga foton, efterbehandlade *(blockerar sektion 3 och 7)*

| ID | Bild |
|---|---|
| E1 | Interiör, kvällsljus, gäster |
| E2 | Smashmomentet — köttet som pressas mot plåten |
| E3 | Personal i arbete |
| E4 | Fasaden på Centralvägen 3 |

### F. Vektor och grafik

| ID | Del |
|---|---|
| F1 | Laddskärmens burgare som SVG i **fem delar** — samma fem som grupp A |
| F2 | Klistermärken: SMASHAD, SEDAN 2017, HANDLAGT, VECKANS BURGARE |
| F3 | Vågövergångar som SVG, med hårfin amber-kant |
| F4 | Loggan som ren SVG — källa finns redan i mappen |

### G. Delning

| ID | Bild |
|---|---|
| G1 | OG-bild 1200×630 |

### Kritisk väg

**A blockerar allt annat.** B faller ut ur A. C är det som säljer.
E är det som skiljer påkostad från mall.

---

## 8. Prestandabudget

| | Gräns |
|---|---|
| Hero, allt som krävs för första skärmen | 400 kB |
| Hela startsidan, allt inladdat | 1,5 MB |
| DOM-noder | under 800 |
| Typsnittsfiler | två, woff2, delmängd med åäö |
| Animerade egenskaper | enbart `transform` och `opacity` |

---

## 9. Två saker som görs annorlunda än CRAV

**Laddskärmen kapas.** CRAV:s kan ligga uppe i över trettio sekunder på
en strypt uppkoppling. Vår ger sig efter **1,8 sekunder oavsett** vad som
är klart, hoppas över vid återbesök i samma session, och hoppas över vid
`prefers-reduced-motion`. Den som googlar öppettiderna ska inte behöva se
en animerad bulle först.

**Beställningsknappen finns överallt.** CRAV:s fasta bottenfält är det
bästa enskilda greppet på hela sajten. Nuvarande delensbistro.se har
Qopla-länken **en gång**, som tunn outline-knapp mitt i hero. Det fasta
amber-fältet löser det på en gång.

---

## 10. Vad som bärs med från nuvarande sajt

- Hela menyinnehållet med priser
- Qopla-länken: `qopla.com/restaurant/delen´s-bistro/qry072eV8q/order`
- Rebrand-berättelsen
- Loggan
- Positioneringen: **smashade** burgare, inte tjocka puckar

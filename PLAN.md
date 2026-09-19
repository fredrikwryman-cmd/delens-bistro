# Delens Bistro — byggplan

Premium-sajt för Delens Bistro, Centralvägen 3, Upplands Väsby.
Parallellbygge på **delens.aimstudios.se**. Ersätter inte
delensbistro.se och kopierar den inte.
Visningsprojekt — ingen kund godkänner urval eller form.

> **Sajten är `noindex` under hela bygget.** Se avsnitt 12. Spärren
> släpps först på uttrycklig order från Fredrik — aldrig som en del av
> en deploy, aldrig i förbigående.

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
| E5 | Väggmålningarna av Petter Skagaard |

E5 har redan sin bildtext skriven i rebrand-sektionen: målningarna är
gjorda av Petter Skagaard och motiven hyllar Väsby och stammisarna.
Bilden behöver visa motiven läsbart — en vid tagning av väggen, inte
ett utsnitt.

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

---

## 11. Domän och publicering

**delens.aimstudios.se** — subdomän under Fredriks egen aimstudios.se,
samma upplägg som tidigare showcases.

**delensbistro.se rörs inte.** Ingen omdirigering, ingen DNS-ändring,
ingen canonical som pekar dit. De två sajterna lever parallellt och vet
inte om varandra.

### Konsekvenser att hantera vid bygget

| Fråga | Läge |
|---|---|
| Värd | aimstudios.se ligger på GitHub Pages. En subdomän kräver CNAME och egen Pages-källa |
| HTTP-headers | **GitHub Pages tillåter inga egna headers.** `X-Robots-Tag` går alltså inte att sätta där — se avsnitt 12 |
| Bassökväg | Egen subdomän betyder rot-sökväg (`/`), inte underkatalog. Vite behöver ingen `base`-justering |
| Certifikat | GitHub Pages utfärdar automatiskt för subdomänen när CNAME är på plats |

Om headers visar sig nödvändiga är Netlify eller Vercel alternativen —
men det är ett beslut som tas om och när det behövs, inte nu.

---

## 12. noindex — gäller hela bygget

Sajten får inte hamna i Google och konkurrera med delensbistro.se om
sökningar på "Delens Bistro". Två sajter för samma restaurang som båda
indexeras skadar bådas synlighet.

### Var spärren sätts

**Tre lager. Alla tre ska finnas, från första deployen.**

| # | Lager | Var | Innehåll |
|---|---|---|---|
| 1 | Metatagg | `<head>` i **varje** HTML-ingång — inte bara startsidan | `<meta name="robots" content="noindex, nofollow">` |
| 2 | robots.txt | `public/robots.txt` | `User-agent: *` + `Disallow: /` |
| 3 | HTTP-header | endast om värden tillåter det | `X-Robots-Tag: noindex, nofollow` |

Lager 3 går **inte** att sätta på GitHub Pages. Där är lager 1 och 2 det
som gäller, och lager 1 är det som faktiskt håller — `robots.txt` hindrar
crawlning men garanterar inte att en känd URL hålls ur indexet.
**Metataggen är den som bär.**

### Vad som samtidigt inte får finnas

- Ingen `sitemap.xml`
- Ingen registrering i Google Search Console
- Inga inlänkar från aimstudios.se eller någon annan publik sajt
- Ingen delning av URL:en i sociala flöden eller chattar som indexeras

### Hur spärren släpps

1. Fredrik säger uttryckligen till. Inget annat utlöser det.
2. Metataggen tas bort ur samtliga HTML-ingångar.
3. `robots.txt` öppnas.
4. `sitemap.xml` läggs till.
5. Sajten registreras i Search Console först därefter.
6. Släppet görs som en **egen commit** med bara den ändringen, så det
   syns i historiken när det skedde.

**Spärren släpps aldrig som sidoeffekt av en deploy och aldrig i
förbigående.** Vid minsta tvekan: låt den ligga kvar och fråga.

### Kontroll före varje deploy

Verifiera att metataggen finns i alla byggda HTML-filer i `dist/`, inte
bara i källfilerna. En ingång som glömts bort är exakt den som hamnar i
indexet.

---

## 13. Typsnitt

Låsta: **Titan One** och **Mouse Memoirs**, båda hämtade från Google
Fonts, båda **självhostade och delmängdade** i `public/typsnitt/`
(19 kB tillsammans). Sajten hämtar ingenting från Google i drift.

Barlow bar sajten fram till 2026-09-19 och är utbytt mot Mouse Memoirs
— samma snitt som CRAV använder till sin brödtext.

*(Placerad sist för att inte bryta hänvisningarna till avsnitt 8, 9 och
12 som redan står i koden.)*

### Regeln

**Titan One används sparsamt — som accent på ett par ställen, inte på
varje rubrik. Mouse Memoirs bär sajten.**

Det är samma fördelning som CRAV har. Mätt på deras sajt: Modak syns på
exakt två ställen, wordmarket och den gula bubbelrubriken. Mouse
Memoirs gör allt annat, inklusive brödtexten. Den feta typen är accent,
inte arbetshäst — och det är därför CRAV inte blir tröttsam trots hur
skrikig Modak är.

### Var Titan One står

| Plats | Varför |
|---|---|
| Hero-lockupen: "DELENS" i kontur + "BISTRO" fylld | Sajtens enda rena varumärkesutrop. Här ska typen skrika |
| Lagersektionens rubrik, fyra rader | Typen **är** konstverket — lagren vävs igenom raderna, och utan en fet form läser inte z-index-växlingen som djup |
| Finalens rad: "Välkommen till Delens Bistro" | Sidans sista mening, under märket som just byggts ihop. Tillagd 2026-09-19 på Fredriks beslut |

**ANTALET ÄR OMFÖRHANDLAT FRÅN TVÅ TILL TRE.** Regeln stod tidigare
att ett tredje ställe krävde att ett av de två första lämnade ifrån
sig sitt. Fredrik beslutade annat, och då är det tre.

Invändningen står kvar och är värd att veta om någon vill gå tillbaka:
finalens rad sitter under loggan, alltså under sajtens tyngsta
varumärkesutrop, och två feta former i samma vy konkurrerar. Raden i
Mouse Memoirs hade låtit märket vara ensamt om att skrika. Det är en
rad i stilmallen att ändra tillbaka — `.final__rad { font-family }`.

**Ingen fjärde plats.** Varje ny rubrik utgår från Mouse Memoirs.

### Var Mouse Memoirs står

Allt annat: sektionsrubriker, signaturburgarnas namn, navigationens
wordmark, footerns namn, brödtext, menyns sjuttio rader, priser,
knappar och klistermärken.

### Vad bytet kostade och gav — uppmätt 2026-09-19

Mouse Memoirs är smalare och tjockare än Barlow. Mätt på glyferna vid
17 px brödtextgrad:

| | Barlow | Mouse Memoirs |
|---|---|---|
| Steg (`n`) | 9,16 px | 6,51 px (−29 %) |
| Stam (`l`) | 1,21 px | 2,19 px (+82 %) |
| Puns i `o` | 4,7 px | **1,49 px** |

**MENYN VANN.** Alla 68 rader ryms på en rad vid 375 px, och vid 305 px
också — förut bröts två rader vid 375 och en gick 34 px utanför skärmen
vid 305. Kortaste prickrad 74 px vid 375, 5 px vid 305.

**BRÖDTEXTEN FÖRLORADE — och graderna lyftes 2026-09-19.** En puns på
1,49 px vid 17 px betyder att `o`, `e` och `a` går ihop till fläckar på
en skärm utan hög pixeltäthet.

Punsen i `o` är **0,090 em**, uppmätt på en renderad glyf vid 1000 px.
Kravet på minst 3 px löser därför ut till 33,3 px grad, och `--t-s`
står nu på 2,125rem = **34 px → 3,06 px puns**. Versalerna hjälper
inte: minsta versalpuns är `R` på 0,089 em, alltså samma sak.

Talet drog med sig hela skalans nedre halva. `m` bar priserna på 23 px
och `l` rättnamnen på 34 — med brödtexten på 34 hade priset varit
mindre än brödtexten och rättnamnet lika stort. En skala är ordningen
mellan graderna, inte graderna i sig.

| | före | efter | puns |
|---|---|---|---|
| xs | 12,8 | 26 | 2,34 px |
| **s** | 17 | **34** | **3,06 px** |
| m | 23,2 | 42 | 3,78 px |
| l | 33,6 | 54 | 4,86 px |
| xl | 57,6 | 72 | 6,48 px |
| xxl, xxxl | oförändrade — bara Titan One | | |

Radavstånden ned i samma rörelse: `--lh-s` 1,55 → 1,32, `--lh-xs` 1,45
→ 1,30, `--lh-m` 1,35 → 1,22, `--lh-l` 1,15 → 1,10.

**Vad det kostade, uppmätt:**

- Sidans längd +9,2 % på desktop (11 706 → 12 778 px), **+17,6 %** på
  390 px (10 098 → 11 875).
- Menyn: 5 av 68 rader bryter vid 375 px, 26 av 68 vid 305 px. Noll
  före lyftet — men också noll vågrät rullning efter, eftersom
  brytmekaniken finns.
- Beställningsfältet 58 → 104 px, alltså 12 % av en 844 px vy.
- Brödtexten vid 390 px: 41 tecken per rad i stället för 62.
- Hero-spalterna kolliderade med BISTRO och är nu bundna till
  lockupens bredd i stället för till ett `ch`-tal.

Nästa steg om det visar sig för stort: `s` på 23 px ger 2,1 px puns och
är den punkt där MEDIAN-gemenen (`e`, `s`, `a`) passerar 3 px. Bara
`o` och `n` ligger under där.

### Radlängden räknas om vid snittbyte

`ch` är bredden på siffran noll, och hur många BOKSTÄVER som ryms per
`ch` beror på snittet: kvoten gemen/noll är 0,91 i Barlow och 0,80 i
Mouse Memoirs. Samma `ch`-tal gav 13 procent fler tecken per rad, och
dokumentspalten gick från omkring 68 tecken till 83. Måtten för löpande
text är nedskalade med 0,82 (62→50, 58→47, 52→42, 46→38 ch). De
`ch`-mått som sätter en avsiktlig radbrytning i kort displaytext står
orörda.

### Tekniska noter

- Titan One finns **bara i vikt 400**. `--font-display-vikt: 400`
  förhindrar syntetisk fetstil, som gör formen smetig.
- Konturvarianten är genomskinlig fyllning plus `-webkit-text-stroke`.
  Aldrig ett eget konturtypsnitt.
- Mouse Memoirs finns **också bara i vikt 400**. Sajtens
  `font-weight: 800` på rubriker och priser ger därför ingen bredare
  form — uppmätt identisk teckenbredd vid 400 och 800. Hierarkin bärs
  av grad, versaler och färg, inte av vikt.
- Google Fonts css2 levererar woff2 per unicode-intervall — bara
  latin-intervallet hämtas och åäö ligger i det.
- **Självhostningen är gjord.** `node verktyg/typsnitt.mjs` hämtar,
  delmängdar och KONTROLLERAR att åäöÅÄÖéÉ–—…×° finns kvar; saknas
  något bryts körningen. Båda filerna preloadas från `<head>`.
  Prestandabudgeten i avsnitt 8 säger två woff2-filer; det håller.

---

## 14. Loggan — avgjort, tas inte upp igen

Restaurangens logga stavar namnet **Delen's** med apostrof. Den är
kundens, den är låst, och det är ett avgjort beslut.

**Gäller:** `delens-logo-sticker`, hero-burgarens inbakade bröd-logga
i B1 och B2, och varje annan plats där loggan förekommer som bild.

**Ingen ska:**

- rita om loggan
- föreslå att den ritas om
- flagga apostrofen som ett fel i en granskning, en rapport eller en
  kodkommentar
- hålla tillbaka en bild, en placering eller ett bygge på grund av den

### Varför det här står här

Namnformen i avsnittet om löpande text är **Delens Bistro** utan
apostrof, och den gäller fortfarande för allt som är SATT TEXT: h1,
title, meta description, og:title, og:site_name, strukturerad data,
navigationens wordmark, footern, alt-texter och formulärtexter.

Skillnaden är att loggan inte är satt text. Den är ett ordmärke, en
bild, en befintlig tillgång. En låst textnamnform säger ingenting om
hur kundens logotyp ser ut, och de två reglerna står inte i konflikt.

Den här punkten finns eftersom apostrofen flaggades som ett fel i tre
rapporter i rad. Det var fel läsning av namnformsregeln. Den läsningen
slutar här.

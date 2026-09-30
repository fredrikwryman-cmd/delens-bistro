/**
 * Hela menyn. Priser i kronor, enligt Qopla 2026-09-28 (först hämtade
 * från delensbistro.se 2026-09-17).
 *
 * `pris` är en sträng eftersom flera rätter har två priser
 * (singel/dubbel, 3st/5st, glas/flaska). Den formateras aldrig om —
 * den skrivs ut som den står på menyn.
 *
 * QOPLA GÄLLER. Priserna följer Qoplas beställningssida, för det är
 * där kunden betalar. Genomgångna mot Qoplas menydata 2026-09-28; se
 * PLAN.md avsnitt 15 för vad som ändrades.
 *
 * `qopla` är rättens namn exakt som i Qopla, Qoplas stavningar
 * inräknade (Bearnasie, Hamburgedressing). Menyassistenten bygger sin
 * lista "leta upp i Qopla" ur det, så kunden måste kunna söka på det.
 * `qoplaVal` är Qoplas namn på storlekarna, i samma ordning som
 * priserna (Singel / Dubbel, 3st / 5st).
 * `qoplaVar` säger var man hittar den, när det inte är en egen
 * produkt med unikt namn: en kategori där namnet finns två gånger
 * (Barnens Favoriter), "val i burgaren" för pommesuppgraderingarna och
 * "tillval i rätten" för extra-tillbehören.
 *
 * Utan `qopla` finns rätten inte att beställa i Qopla: det gäller
 * baren, som bara serveras i restaurangen. Ändras ett pris här ska det
 * stämma med Qopla.
 */

export const kategorier = [
  {
    id: 'hamburgare',
    namn: 'Hamburgare',
    underrubrik: 'Singel / dubbel',
    bild: 'C1',
    ratter: [
      {
        bild: 'C5',
        namn: 'Cheeseburger',
        pris: '129 / 164',
        qopla: 'Cheeseburger', qoplaVal: ['Singel', 'Dubbel'],
        innehall: '100 g kött, sallad, rödlök, hamburgerdressing, cheddar'
      },
      {
        bild: 'C1',
        namn: 'Delens Sign.',
        pris: '144 / 179',
        qopla: 'Delens Signature', qoplaVal: ['Singel', 'Dubbel'],
        innehall: '100 g kött, tryffelmajo, parmesan, cheddar, champinjoner, rostad lök',
        signatur: true
      },
      {
        bild: 'C2',
        namn: 'Emils Ch. Dlx.',
        pris: '149 / 184',
        qopla: 'Emils Cheese Deluxe', qoplaVal: ['Singel', 'Dubbel'],
        innehall: '100 g kött, sallad, picklad rödlök, bacon, 2 st chilicheese, dubbel cheddar, smält cheddar, chilimajo',
        signatur: true
      },
      {
        bild: 'M01',
        namn: 'Bacon & BBQ',
        pris: '139 / 174',
        qopla: 'Bacon & BBQ-Burger', qoplaVal: ['Singel', 'Dubbel'],
        innehall: '100 g kött, bacon, cheddar, picklad rödlök, sallad, majo, BBQ-sås'
      },
      {
        bild: 'C4',
        namn: 'Hot One',
        pris: '139 / 174',
        qopla: 'Hot One', qoplaVal: ['Singel', 'Dubbel'],
        innehall: '100 g kött, sallad, picklad rödlök, picklad chili, jalapeños, chilimajo, pepper jack-ost',
        signatur: true
      },
      {
        bild: 'C3',
        namn: 'The Beast',
        pris: '285',
        qopla: 'The Beast',
        innehall: '4 × 100 g kött, bacon, 3 st lökringar, sallad, cheddar, picklad rödlök, majo, BBQ-sås',
        signatur: true
      },
      {
        namn: 'Veckans burgare',
        pris: '175',
        qopla: 'Veckans Burgare',
        innehall: 'Fråga personalen om veckans burgare'
      }
    ]
  },

  {
    id: 'kyckling-vego',
    namn: 'Kyckling & vego',
    bild: 'D1',
    ratter: [
      {
        bild: 'M02',
        namn: 'Chicken burgare',
        pris: '165',
        qopla: 'Chicken Burger',
        innehall: 'Crispy chicken, hamburgerdressing, rödlök, sallad'
      },
      {
        bild: 'M03',
        namn: 'Tryffel chicken',
        pris: '165',
        qopla: 'Tryffel Chicken',
        innehall: 'Crispy chicken, tryffelmajo, picklad rödlök, sallad'
      },
      {
        bild: 'M04',
        namn: 'Hot chicken',
        pris: '165',
        qopla: 'Hot Chicken',
        innehall: 'Crispy chicken, chilimajo, jalapeños, picklad chili, picklad rödlök, sallad'
      },
      {
        bild: 'M05',
        namn: 'Veggie',
        pris: '149',
        qopla: 'Veggie',
        innehall: 'Halloumi, hamburgerdressing, rödlök, sallad'
      },
      {
        bild: 'M06',
        namn: 'Hot veggie',
        pris: '155',
        qopla: 'Hot Veggie',
        innehall: 'Halloumi, chilimajo, jalapeños, picklad chili, picklad rödlök, sallad'
      },
      {
        bild: 'M07',
        namn: 'Tryffel veggie',
        pris: '155',
        qopla: 'Tryffel Veggie',
        innehall: 'Halloumi, tryffelmajo, picklad rödlök, sallad'
      }
    ]
  },

  {
    id: 'kebab',
    namn: 'Kebab',
    bild: 'D2',
    ratter: [
      {
        bild: 'M08',
        namn: 'Kebabrulle',
        pris: '135',
        qopla: 'Kebabrulle',
        innehall: 'Kebabkött eller kyckling, rostad lök, isbergssallad, rödkål, inlagd gurka, rödlök, feferoni, röd- och vitsås'
      },
      {
        bild: 'M09',
        namn: 'Kebabtallrik',
        pris: '135',
        qopla: 'Kebabtallrik', qoplaVar: 'Kebab',
        innehall: 'Kebabkött eller kyckling, rostad lök, isbergssallad, rödkål, inlagd gurka, rödlök, feferoni, röd- och vitsås. Välj pommes eller ris'
      }
    ]
  },

  {
    id: 'bowls',
    namn: 'Bowls',
    bild: 'D3',
    ratter: [
      {
        bild: 'M10',
        namn: 'Kebab i bowl',
        pris: '135',
        qopla: 'Kebab I Bowl',
        innehall: 'Kebabkött eller kyckling, isbergssallad, rödkål, inlagd gurka, rödlök, röd- och vitsås, feferoni'
      },
      {
        bild: 'M11',
        namn: 'Delens kebab',
        pris: '165',
        qopla: 'Delens Kebab I Bowl',
        innehall: 'Kebabkött, kyckling eller crispy chicken, ost, isbergssallad, rödkål, rödlök, inlagd gurka, rostad lök, 2 st chilicheese, röd- och vitsås, bearnaise, feferoni'
      },
      {
        bild: 'M12',
        namn: 'Crispy chicken',
        pris: '135',
        qopla: 'Crispy Chicken I Bowl',
        innehall: 'Crispy chicken, isbergssallad, rödkål, inlagd gurka, rödlök, röd- och vitsås, feferoni'
      },
      {
        bild: 'M13',
        namn: 'Hamburgare i bowl',
        pris: '139',
        qopla: 'Hamburgare I Bowl',
        innehall: 'Kött, cheddar, isbergssallad, rödkål, inlagd gurka, rostad lök, rödlök, röd- och vitsås, feferoni'
      },
      {
        bild: 'M14',
        namn: 'Halloumi i bowl',
        pris: '155',
        qopla: 'Halloumi I Bowl',
        innehall: 'Halloumi, isbergssallad, rödkål, inlagd gurka, rostad lök, rödlök, röd- och vitsås, feferoni'
      }
    ]
  },

  {
    id: 'barn',
    namn: 'Barnens favoriter',
    bild: 'D4',
    ratter: [
      { bild: 'M15', namn: 'Kebabtallrik', pris: '69', qopla: 'Kebabtallrik', qoplaVar: 'Barnens Favoriter', innehall: 'Serveras med pommes eller ris' },
      {
        bild: 'M16',
        namn: 'Hamburgare',
        pris: '69',
        qopla: 'Hamburgare', qoplaVar: 'Barnens Favoriter',
        innehall: '60 g kött, ost, sallad, hamburgerdressing. Serveras med pommes, inkl. fruktdryck'
      },
      { bild: 'M17', namn: 'Chicken popcorn', pris: '69', qopla: 'Chicken Popcorn', qoplaVar: 'Barnens Favoriter', innehall: 'Serveras med pommes' },
      { bild: 'M18', namn: 'Pannkakor', pris: '69', qopla: 'Pannkakor', qoplaVar: 'Barnens Favoriter', innehall: 'Serveras med sylt och vaniljglass' }
    ]
  },

  {
    id: 'tillbehor',
    namn: 'Tillbehör',
    bild: 'D5',
    ratter: [
      { bild: 'M20', namn: 'Mozzarellasticks', pris: '45 / 56', innehall: '3 st / 5 st', qopla: 'Mozzarella sticks', qoplaVal: ['3st', '5st'] },
      { bild: 'M21', namn: 'Chilicheese', pris: '45 / 56', innehall: '3 st / 5 st', qopla: 'Chilicheese', qoplaVal: ['3st', '5st'] },
      { bild: 'M22', namn: 'Lökringar', pris: '45 / 56', innehall: '3 st / 5 st', qopla: 'Lökringar', qoplaVal: ['3st', '5st'] },
      { bild: 'M19', namn: 'Chicken popcorn', pris: '56', qopla: 'Chicken Popcorn', qoplaVar: 'Tillbehör' },
      { namn: 'Extra bacon', pris: '15', innehall: 'Tillval i rätten', qopla: 'Extra Bacon', qoplaVar: 'tillval i rätten' },
      { namn: 'Extra ost', pris: '12', innehall: 'Tillval i rätten', qopla: 'Extra Ost', qoplaVar: 'tillval i rätten' },
      { namn: 'Extra kött', pris: '35', innehall: 'Tillval i rätten', qopla: 'Extra Kött', qoplaVar: 'tillval i rätten' },
      { namn: 'Side sallad', pris: '46', qopla: 'Side Sallad' },
      { bild: 'M23', namn: 'Sötpotatispommes', pris: '35', innehall: 'Uppgradera till', qopla: 'Sötpotatispommes', qoplaVar: 'val i burgaren' },
      { bild: 'M24', namn: 'Loaded fries', pris: '45', innehall: 'Uppgradera till', qopla: 'Loaded Fries', qoplaVar: 'val i burgaren' },
      { bild: 'M25', namn: 'Tryffel fries', pris: '45', innehall: 'Uppgradera till', qopla: 'Tryffel Fries', qoplaVar: 'val i burgaren' }
    ]
  },

  {
    id: 'dipp',
    namn: 'Dipp',
    underrubrik: '19 kr styck',
    ratter: [
      { namn: 'Aioli', pris: '19', qopla: 'Aioli' },
      { namn: 'BBQ', pris: '19', qopla: 'BBQ' },
      { namn: 'Bearnaise', pris: '19', qopla: 'Bearnasie' },
      { namn: 'Smält cheddar', pris: '19', qopla: 'Smällt Cheddar' },
      { namn: 'Chilimajonnäs', pris: '19', qopla: 'Chilimajonäs' },
      { namn: 'Tryffelmajonnäs', pris: '19', qopla: 'Tryffelmajonäs' },
      { namn: 'Hamburgerdressing', pris: '19', qopla: 'Hamburgedressing' }
    ]
  },

  {
    id: 'efterratter',
    namn: 'Efterrätter',
    bild: 'D6',
    ratter: [
      {
        bild: 'M26',
        namn: 'Milkshake m. grädde',
        pris: '91',
        qopla: 'Milkshake Med Grädde',
        innehall: 'Vanilj, choklad, hallon, jordgubb, saltlakrits eller hallon/saltlakrits'
      },
      { bild: 'M27', namn: 'Churros', pris: '68', qopla: 'Churros', innehall: 'Med kanelsocker och nougatsås' },
      { bild: 'M28', namn: 'Kladdkaka', pris: '68', qopla: 'Kladdkaka', innehall: 'Vaniljglass och chokladsås' }
    ]
  },

  {
    id: 'ol-cider',
    namn: 'Öl & cider',
    ratter: [
      { namn: 'Norrlands Guld', pris: '62 / 72', innehall: 'Fatöl 40 cl / 50 cl' },
      { namn: 'Krusovice', pris: '85 / 95', innehall: 'Fatöl 40 cl / 50 cl' },
      { namn: 'Pistonhead Haze', pris: '95 / 105', innehall: 'Fatöl 40 cl / 50 cl' },
      { namn: 'Sol', pris: '79', innehall: 'Flaska' },
      { namn: 'Mariestad Exp.', pris: '89', innehall: 'Flaska' },
      { namn: 'Mariestad Cont.', pris: '79', innehall: 'Flaska' },
      { namn: 'Poppels Passion', pris: '99', innehall: 'Flaska' },
      { namn: 'Daura', pris: '79', innehall: 'Flaska, glutenfri' },
      { namn: 'Briska fläder', pris: '79', innehall: 'Cider' },
      { namn: 'Briska päron', pris: '79', innehall: 'Cider' },
      { namn: 'Briska hallon/vinbär', pris: '79', innehall: 'Cider' }
    ]
  },

  {
    id: 'vin-sprit',
    namn: 'Vin & sprit',
    ratter: [
      { namn: 'Husets vita', pris: '85 / 340', innehall: 'Glas / flaska' },
      { namn: 'Husets röda', pris: '85 / 340', innehall: 'Glas / flaska' },
      { namn: 'Husets rosé', pris: '85 / 340', innehall: 'Glas / flaska' },
      { namn: 'Prosecco', pris: '129', innehall: '20 cl' },
      { namn: 'Jack Daniels', pris: '30', innehall: 'Per cl' },
      { namn: 'Jameson', pris: '30', innehall: 'Per cl' },
      { namn: 'Laphroaig 10Y', pris: '39', innehall: 'Per cl' },
      { namn: 'Macallan 12Y', pris: '39', innehall: 'Per cl' },
      { namn: 'Gin & tonic', pris: '129 / 149', innehall: 'Drink 4 cl / 6 cl' },
      { namn: 'Cuba Libre', pris: '129 / 149', innehall: 'Drink 4 cl / 6 cl' },
      { namn: 'Blanco 43', pris: '129 / 149', innehall: 'Drink 4 cl / 6 cl' }
    ]
  }
];

/** De fem signaturburgarna, i den ordning de visas i sektion 5. */
export const signaturer = [
  { id: 'C1', namn: 'Delens Sign.', pris: '144 / 179', pitch: 'Tryffelmajo, parmesan, champinjoner, rostad lök. Den som bär namnet.' },
  { id: 'C2', namn: 'Emils Ch. Dlx.', pris: '149 / 184', pitch: 'Dubbel cheddar, smält cheddar, två chilicheese, bacon. Mest laddad på menyn.' },
  { id: 'C3', namn: 'The Beast', pris: '285', pitch: 'Fyra hundragramspuckar, bacon, lökringar. Den man delar — eller inte.' },
  { id: 'C4', namn: 'Hot One', pris: '139 / 174', pitch: 'Jalapeños, picklad chili, chilimajo, pepper jack. Hettan.' },
  { id: 'C5', namn: 'Cheeseburger', pris: '129 / 164', pitch: 'Sallad, rödlök, hamburgerdressing, cheddar. Ingenting att gömma sig bakom.' }
];

/**
 * Öppettider. Index 0 = söndag, enligt Date.getDay().
 *
 * STÄNGNINGEN ÄR RÖRLIG. Restaurangen stänger 20 eller 21 beroende på
 * om det finns gäster kvar. `till` är den senaste tiden, och det är
 * den öppetstatusen räknar med. Besökaren får se båda: `stangning`
 * står i öppettiderna, i fästfältet och i Fråga kocken.
 */
export const oppettider = [
  { dag: 'Söndag', fran: '12:00', till: '21:00' },
  { dag: 'Måndag', fran: '11:00', till: '21:00' },
  { dag: 'Tisdag', fran: '11:00', till: '21:00' },
  { dag: 'Onsdag', fran: '11:00', till: '21:00' },
  { dag: 'Torsdag', fran: '11:00', till: '21:00' },
  { dag: 'Fredag', fran: '11:00', till: '21:00' },
  { dag: 'Lördag', fran: '12:00', till: '21:00' }
];

export const stangerKort = '20–21';
export const stangerVillkor = 'beroende på gäster';
export const stangning = stangerKort + ', ' + stangerVillkor;

export const kontakt = {
  adress: 'Centralvägen 3, 194 76 Upplands Väsby',
  telefon: '08-420 065 64',
  telefonLank: 'tel:+46842006564',
  epost: 'info@delensbistro.se',
  facebook: 'https://www.facebook.com/DelensBistro/',
  /* Instagram står INTE på restaurangens egen sajt — den länkar bara
     Facebook. Adressen är hämtad ur kontot självt, vars sidtitel läser
     "@delensbistro — Delens bistro & burger". Stäms av med Hakan innan
     skarp lansering. */
  instagram: 'https://www.instagram.com/delensbistro/',
  bestall: 'https://qopla.com/restaurant/delen%C2%B4s-bistro/qry072eV8q/order'
};

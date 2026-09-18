/**
 * Hela menyn. Priser i kronor, hämtade från delensbistro.se 2026-09-17.
 *
 * `pris` är en sträng eftersom flera rätter har två priser
 * (singel/dubbel, 3st/5st, glas/flaska). Den formateras aldrig om —
 * den skrivs ut som den står på menyn.
 */

export const kategorier = [
  {
    id: 'hamburgare',
    namn: 'Hamburgare',
    underrubrik: 'Singel / dubbel',
    bild: 'C1',
    ratter: [
      {
        namn: 'Cheeseburger',
        pris: '129 / 164',
        innehall: '100 g kött, sallad, rödlök, hamburgerdressing, cheddar'
      },
      {
        namn: 'Delens Sign.',
        pris: '144 / 179',
        innehall: '100 g kött, tryffelmajo, parmesan, cheddar, champinjoner, rostad lök',
        signatur: true
      },
      {
        namn: 'Emils Ch. Dlx.',
        pris: '149 / 184',
        innehall: '100 g kött, sallad, picklad rödlök, bacon, 2 st chilicheese, dubbel cheddar, smält cheddar, chilimajo',
        signatur: true
      },
      {
        namn: 'Bacon & BBQ',
        pris: '139 / 174',
        innehall: '100 g kött, bacon, cheddar, picklad rödlök, sallad, majo, BBQ-sås'
      },
      {
        namn: 'Hot One',
        pris: '139 / 174',
        innehall: '100 g kött, sallad, picklad rödlök, picklad chili, jalapeños, chilimajo, pepper jack-ost',
        signatur: true
      },
      {
        namn: 'The Beast',
        pris: '285',
        innehall: '4 × 100 g kött, bacon, 3 st lökringar, sallad, cheddar, picklad rödlök, majo, BBQ-sås',
        signatur: true
      },
      {
        namn: 'Veckans burgare',
        pris: '175',
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
        namn: 'Chicken burgare',
        pris: '165',
        innehall: 'Crispy chicken, hamburgerdressing, rödlök, sallad'
      },
      {
        namn: 'Tryffel chicken',
        pris: '165',
        innehall: 'Crispy chicken, tryffelmajo, picklad rödlök, sallad'
      },
      {
        namn: 'Hot chicken',
        pris: '165',
        innehall: 'Crispy chicken, chilimajo, jalapeños, picklad chili, picklad rödlök, sallad'
      },
      {
        namn: 'Veggie',
        pris: '149',
        innehall: 'Halloumi, hamburgerdressing, rödlök, sallad'
      },
      {
        namn: 'Hot veggie',
        pris: '155',
        innehall: 'Halloumi, chilimajo, jalapeños, picklad chili, picklad rödlök, sallad'
      },
      {
        namn: 'Tryffel veggie',
        pris: '155',
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
        namn: 'Kebabrulle',
        pris: '135',
        innehall: 'Kebabkött eller kyckling, rostad lök, isbergssallad, rödkål, inlagd gurka, rödlök, feferoni, röd- och vitsås'
      },
      {
        namn: 'Kebabtallrik',
        pris: '135',
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
        namn: 'Kebab i bowl',
        pris: '135',
        innehall: 'Kebabkött eller kyckling, isbergssallad, rödkål, inlagd gurka, rödlök, röd- och vitsås, feferoni'
      },
      {
        namn: 'Delens kebab',
        pris: '165',
        innehall: 'Kebabkött, kyckling eller crispy chicken, ost, isbergssallad, rödkål, rödlök, inlagd gurka, rostad lök, 2 st chilicheese, röd- och vitsås, bearnaise, feferoni'
      },
      {
        namn: 'Crispy chicken',
        pris: '135',
        innehall: 'Crispy chicken, isbergssallad, rödkål, inlagd gurka, rödlök, röd- och vitsås, feferoni'
      },
      {
        namn: 'Hamburgare i bowl',
        pris: '139',
        innehall: 'Kött, cheddar, isbergssallad, rödkål, inlagd gurka, rostad lök, rödlök, röd- och vitsås, feferoni'
      },
      {
        namn: 'Halloumi i bowl',
        pris: '155',
        innehall: 'Halloumi, isbergssallad, rödkål, inlagd gurka, rostad lök, rödlök, röd- och vitsås, feferoni'
      }
    ]
  },

  {
    id: 'barn',
    namn: 'Barnens favoriter',
    bild: 'D4',
    ratter: [
      { namn: 'Kebabtallrik', pris: '69', innehall: 'Serveras med pommes eller ris' },
      {
        namn: 'Hamburgare',
        pris: '69',
        innehall: '60 g kött, ost, sallad, hamburgerdressing. Serveras med pommes, inkl. fruktdryck'
      },
      { namn: 'Chicken popcorn', pris: '69', innehall: 'Serveras med pommes' },
      { namn: 'Pannkakor', pris: '69', innehall: 'Serveras med sylt och vaniljglass' }
    ]
  },

  {
    id: 'tillbehor',
    namn: 'Tillbehör',
    bild: 'D5',
    ratter: [
      { namn: 'Mozzarellasticks', pris: '39 / 49', innehall: '3 st / 5 st' },
      { namn: 'Chilicheese', pris: '39 / 49', innehall: '3 st / 5 st' },
      { namn: 'Lökringar', pris: '39 / 49', innehall: '3 st / 5 st' },
      { namn: 'Chicken popcorn', pris: '49' },
      { namn: 'Extra bacon', pris: '15' },
      { namn: 'Extra ost', pris: '12' },
      { namn: 'Extra kött', pris: '35' },
      { namn: 'Side sallad', pris: '40' },
      { namn: 'Sötpotatispommes', pris: '35', innehall: 'Uppgradera till' },
      { namn: 'Loaded fries', pris: '45', innehall: 'Uppgradera till' },
      { namn: 'Tryffel fries', pris: '45', innehall: 'Uppgradera till' }
    ]
  },

  {
    id: 'dipp',
    namn: 'Dipp',
    underrubrik: '19 kr styck',
    ratter: [
      { namn: 'Aioli', pris: '19' },
      { namn: 'BBQ', pris: '19' },
      { namn: 'Bearnaise', pris: '19' },
      { namn: 'Chili bearnaise', pris: '19' },
      { namn: 'Smält cheddar', pris: '19' },
      { namn: 'Chilimajonnäs', pris: '19' },
      { namn: 'Tryffelmajonnäs', pris: '19' },
      { namn: 'Hamburgerdressing', pris: '19' }
    ]
  },

  {
    id: 'efterratter',
    namn: 'Efterrätter',
    bild: 'D6',
    ratter: [
      {
        namn: 'Milkshake m. grädde',
        pris: '79',
        innehall: 'Vanilj, choklad, hallon, jordgubb, saltlakrits eller hallon/saltlakrits'
      },
      { namn: 'Churros', pris: '59', innehall: 'Med kanelsocker och nougatsås' },
      { namn: 'Kladdkaka', pris: '59', innehall: 'Vaniljglass och chokladsås' }
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

/** Öppettider. Index 0 = söndag, enligt Date.getDay(). */
export const oppettider = [
  { dag: 'Söndag', fran: '12:00', till: '21:00' },
  { dag: 'Måndag', fran: '11:00', till: '20:00' },
  { dag: 'Tisdag', fran: '11:00', till: '20:00' },
  { dag: 'Onsdag', fran: '11:00', till: '20:00' },
  { dag: 'Torsdag', fran: '11:00', till: '20:00' },
  { dag: 'Fredag', fran: '11:00', till: '21:00' },
  { dag: 'Lördag', fran: '12:00', till: '21:00' }
];

export const kontakt = {
  adress: 'Centralvägen 3, 194 76 Upplands Väsby',
  telefon: '08-420 065 64',
  telefonLank: 'tel:+46842006564',
  epost: 'info@delensbistro.se',
  facebook: 'https://www.facebook.com/DelensBistro/',
  bestall: 'https://qopla.com/restaurant/delen%C2%B4s-bistro/qry072eV8q/order'
};

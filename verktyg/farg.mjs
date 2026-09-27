/**
 * Färgskifte för ritade bilder, gjort på vägen in i pipelinen.
 *
 * Källorna går i en ljus, rosaröd ton som inte finns någon annanstans
 * på sajten. Originalen ligger orörda i kalla/; det här flyttar den
 * röda fyllningen till en given målfärg i minnet innan bilden skalas
 * och kodas.
 *
 * MODELLEN ÄR EN BLANDNING MELLAN RÖTT OCH VITT. En pixel i de här
 * bilderna är antingen fyllning, kontur eller en kantpixel där de två
 * möts. Varje pixel projiceras på linjen mellan källans röda och vitt,
 * och t — hur långt mot det röda den ligger — avgör hur mycket av
 * skiftet den får:
 *
 *   t = 1   fyllningen: flyttas hela vägen till målfärgen
 *   t = 0   den vita konturen: rörs inte
 *   0 < t   kantpixlarna mellan dem: flyttas i proportion
 *
 * Skiftet är en förskjutning, inte ett utbyte. Pixelns avvikelse från
 * källans röda — tryckets struktur, papperskornet — följer med, så
 * fyllningen inte blir en platt färgyta. t kläms till 0–1: mörka
 * dammkorn och klarröda stänk i kanten får samma skifte som
 * fyllningen, aldrig mer.
 *
 * Alfa rörs inte.
 */

/** "#rrggbb" → [r, g, b] */
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/**
 * Skiftar källans röda till målfärgen i en rå RGBA-buffert, på plats.
 *
 * @param {Buffer} data  rå RGBA, icke förmultiplicerad (sharp .raw())
 * @param {number[]} kalla  källans röda fyllning, uppmätt
 * @param {number[]} mal  målfärgen
 */
export function skiftaRott(data, kalla, mal) {
  const vit = [255, 255, 255];
  const ax = vit.map((v, i) => v - kalla[i]);
  const langd2 = ax.reduce((s, v) => s + v * v, 0);
  const skift = mal.map((m, i) => m - kalla[i]);

  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] === 0) continue;
    let t =
      ((vit[0] - data[p]) * ax[0] +
        (vit[1] - data[p + 1]) * ax[1] +
        (vit[2] - data[p + 2]) * ax[2]) /
      langd2;
    t = Math.min(1, Math.max(0, t));
    for (let i = 0; i < 3; i++) {
      data[p + i] = Math.min(255, Math.max(0, Math.round(data[p + i] + t * skift[i])));
    }
  }
}

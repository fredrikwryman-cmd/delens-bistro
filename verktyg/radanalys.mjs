import sharp from 'sharp';
const fil = process.argv[2];
const { data, info } = await sharp(fil).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const rader = [];
for (let y = 0; y < H; y++) {
  let n = 0, lum = 0, varm = 0, matt = 0;
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    lum += 0.299 * r + 0.587 * g + 0.114 * b;
    varm += r - b;                       // orange glasyr har högt R-B
    matt += Math.max(r, g, b) - Math.min(r, g, b); // mättnad
    n++;
  }
  rader.push({ y, n, lum: n ? lum / n : 0, varm: n ? varm / n : 0, matt: n ? matt / n : 0 });
}
const med = rader.filter(r => r.n > W * 0.2);
console.log('rader med innehåll:', med[0].y, '-', med.at(-1).y);
// skriv var 15:e rad i nedre halvan
for (const r of med) {
  if (r.y < med[0].y + (med.at(-1).y - med[0].y) * 0.55) continue;
  if (r.y % 12) continue;
  console.log(`y=${r.y} bredd=${Math.round(r.n / W * 100)}% ljus=${Math.round(r.lum)} varm=${Math.round(r.varm)} mattnad=${Math.round(r.matt)}`);
}

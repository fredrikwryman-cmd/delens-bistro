import sharp from 'sharp';
const fil = process.argv[2];
const { data, info } = await sharp(fil).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const x0 = Math.round(W * 0.3), x1 = Math.round(W * 0.7);
for (let y = Number(process.argv[3]); y <= Number(process.argv[4]); y += 6) {
  let n = 0, lum = 0, ljusa = 0;
  for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * C;
    if (data[i + 3] < 200) continue;
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    lum += l; n++; if (l > 150) ljusa++;
  }
  const bar = '█'.repeat(Math.round((n ? lum / n : 0) / 10));
  console.log(`y=${y} mitt-ljus=${n ? Math.round(lum / n) : 0} ljusa=${n ? Math.round(ljusa / n * 100) : 0}% ${bar}`);
}

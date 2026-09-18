import sharp from 'sharp';
const mat = async (fil) => {
  const { data, info } = await sharp(fil).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let s = 0, n = 0, ljusa = 0, max = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const a = data[i + 3];
    if (a < 30 || a > 200) continue;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    s += lum; n++; if (lum > 200) ljusa++; if (lum > max) max = lum;
  }
  return { fil: fil.split('/').pop(), kantpixlar: n, medelljus: n ? Math.round(s / n) : 0, over200: ljusa, hogsta: Math.round(max) };
};
for (const f of process.argv.slice(2)) console.log(await mat(f));

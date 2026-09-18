import sharp from 'sharp';

const mat = async (fil) => {
  const { data, info } = await sharp(fil).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };

  // Bakgrund: medel av fyra hörnrutor 60×60
  let r = 0, g = 0, b = 0, n = 0;
  for (const [cx, cy] of [[0, 0], [W - 60, 0], [0, H - 60], [W - 60, H - 60]])
    for (let y = cy; y < cy + 60; y++) for (let x = cx; x < cx + 60; x++) {
      const p = px(x, y); r += p[0]; g += p[1]; b += p[2]; n++;
    }
  const bg = [r / n, g / n, b / n].map(v => Math.round(v));

  // Motivets ruta: pixlar tydligt ljusare än bakgrunden
  const trosk = Math.max(bg[0], bg[1], bg[2]) + 28;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const p = px(x, y);
    if (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] < trosk) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }

  return {
    fil: fil.split(/[\/]/).pop(),
    matt: `${W}×${H}`,
    bakgrund: `rgb(${bg.join(',')})`,
    bakgrundHex: '#' + bg.map(v => v.toString(16).padStart(2, '0')).join(''),
    gront_stick: Math.round(bg[1] - (bg[0] + bg[2]) / 2),
    motiv: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
    motiv_procent: {
      tomt_ovanfor: Math.round(y0 / H * 100) + ' %',
      tomt_nedanfor: Math.round((H - y1) / H * 100) + ' %',
      hojd: Math.round((y1 - y0) / H * 100) + ' %'
    }
  };
};

for (const f of process.argv.slice(2)) console.log(JSON.stringify(await mat(f), null, 1));

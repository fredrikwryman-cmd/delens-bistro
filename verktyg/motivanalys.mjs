import sharp from 'sharp';
/** Hittar motivets ruta: pixlar som är tydligt ljusare än bakgrunden. */
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  // Bakgrundsnivå ur de fyra hörnen
  let bg = 0, bn = 0;
  for (const [cx, cy] of [[0,0],[W-80,0],[0,H-80],[W-80,H-80]])
    for (let y = cy; y < cy+80; y++) for (let x = cx; x < cx+80; x++) {
      const i = (y*W+x)*C; bg += 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2]; bn++;
    }
  bg /= bn;
  const trosk = bg + 55;
  let x0=W,y0=H,x1=-1,y1=-1;
  for (let y=0; y<H; y+=2) for (let x=0; x<W; x+=2) {
    const i=(y*W+x)*C;
    if (0.299*data[i]+0.587*data[i+1]+0.114*data[i+2] < trosk) continue;
    if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
  }
  console.log(JSON.stringify({
    fil: f.split(/[\/]/).pop(),
    duk: `${W}×${H}`,
    bakgrund: Math.round(bg),
    motiv: { x: x0, y: y0, b: x1-x0, h: y1-y0 },
    andel_hojd: Math.round((y1-y0)/H*100) + ' %',
    topp: Math.round(y0/H*100) + ' %',
    botten: Math.round((H-y1)/H*100) + ' %',
    motivforhallande: ((x1-x0)/(y1-y0)).toFixed(2)
  }));
}

// Numbers behind the plain-language chart summary.

function analyse(d, range) {
  const pts = d.points, first = pts[0][1], last = pts.at(-1)[1];
  let peak = -Infinity, dd = 0, peakAt = 0, troughAt = 0, ddPeak = 0;
  pts.forEach(([t, v]) => {
    if (v > peak) { peak = v; peakAt = t; }
    const x = v / peak - 1;
    if (x < dd) { dd = x; troughAt = t; ddPeak = peakAt; }
  });
  const perYear = { "1mo":252, "6mo":252, "ytd":252, "1y":252, "5y":52, "max":12 }[range];
  let vol = null;
  if (perYear && pts.length > 10) {
    const rets = pts.slice(1).map((p, i) => Math.log(p[1] / pts[i][1]));
    const m = rets.reduce((a, b) => a + b, 0) / rets.length;
    vol = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1) * perYear) * 100;
  }
  return { change: (last / first - 1) * 100, first, last, dd: dd * 100, ddPeak, troughAt, vol,
    hi: Math.max(...pts.map(p => p[1])), lo: Math.min(...pts.map(p => p[1])) };
}

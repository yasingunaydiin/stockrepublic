// The interactive price chart.

function drawChart(points, cur, range, up, buy) {
  const el = $("#chart"), W = el.clientWidth, H = el.clientHeight;
  const pad = { l: 8, r: 64, t: 12, b: 26 };
  const xs = points.map(p => p[0]), ys = points.map(p => norm(cur, p[1]));
  let lo = Math.min(...ys), hi = Math.max(...ys);
  // Stretch the scale to show your buy price, unless it's so far off it would flatten the line.
  const showBuy = buy != null && buy > lo * 0.6 && buy < hi * 1.4;
  if (showBuy) { lo = Math.min(lo, buy); hi = Math.max(hi, buy); }
  const step = niceStep((hi - lo) / 4 || hi * 0.01);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const X = i => pad.l + i / (points.length - 1) * (W - pad.l - pad.r);
  const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const color = up ? "var(--up)" : "var(--down)";
  const sym = SYMBOLS[cur] ?? "";
  let grid = "";
  for (let v = lo; v <= hi + step / 2; v += step) {
    grid += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/>
      <text x="${W - pad.r + 8}" y="${Y(v) + 4}" font-size="11" fill="var(--muted)" font-family="var(--f-num)">${sym.trim()}${v.toLocaleString("en-US", { maximumFractionDigits: step < 1 ? 2 : 0 })}</text>`;
  }
  let xl = "";
  const n = W < 480 ? 3 : 5;
  for (let k = 0; k < n; k++) {
    const i = Math.round(k / (n - 1) * (points.length - 1));
    const lbl = range === "1d" ? fmtDate(xs[i], "1d") : new Date(xs[i] * 1000).toLocaleDateString([], range === "5d" ? { weekday: "short", day: "numeric" } : range === "5y" || range === "max" ? { year: "numeric" } : { day: "numeric", month: "short" });
    xl += `<text x="${X(i)}" y="${H - 6}" font-size="11" fill="var(--muted)" text-anchor="${k === 0 ? "start" : k === n - 1 ? "end" : "middle"}">${lbl}</text>`;
  }
  const line = ys.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" L");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Price chart">
    <defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${up ? "var(--up)" : "var(--down)"}" stop-opacity=".22"/>
      <stop offset="1" stop-color="${up ? "var(--up)" : "var(--down)"}" stop-opacity="0"/></linearGradient></defs>
    ${grid}${xl}
    <path d="M${X(0)},${H - pad.b} L${line} L${X(ys.length - 1)},${H - pad.b} Z" fill="url(#fill)"/>
    <path d="M${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${X(ys.length - 1)}" cy="${Y(ys.at(-1))}" r="4" fill="${color}"/>
    ${showBuy ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${Y(buy)}" y2="${Y(buy)}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="6 4"/>
      <text x="${pad.l + 4}" y="${Y(buy) - 6}" font-size="11" font-weight="600" fill="var(--accent)">Your avg. buy price ≈ ${sym.trim()}${buy.toLocaleString("en-US", { maximumFractionDigits: 2 })}</text>` : ""}
    <g id="cross" visibility="hidden"><line id="cl" y1="${pad.t}" y2="${H - pad.b}" stroke="var(--muted)" stroke-dasharray="3 3"/>
      <circle id="cc" r="5" fill="var(--surface)" stroke="${color}" stroke-width="2"/></g>
  </svg><div class="tip" id="tip" hidden></div>`;
  const svg = el.querySelector("svg"), cross = $("#cross"), tip = $("#tip");
  const move = e => {
    const r = svg.getBoundingClientRect(), x = e.clientX - r.left;
    const i = Math.max(0, Math.min(points.length - 1, Math.round((x - pad.l) / (W - pad.l - pad.r) * (points.length - 1))));
    const cx = X(i), cy = Y(ys[i]);
    cross.setAttribute("visibility", "visible");
    $("#cl").setAttribute("x1", cx); $("#cl").setAttribute("x2", cx);
    $("#cc").setAttribute("cx", cx); $("#cc").setAttribute("cy", cy);
    const fromStart = (ys[i] / ys[0] - 1) * 100;
    tip.hidden = false;
    tip.innerHTML = `<b>${money(points[i][1], cur)}</b> · ${fmtDate(xs[i], range)} · ${pct(fromStart)} from start`;
    tip.style.left = Math.max(110, Math.min(W - 110, cx)) + "px";
    tip.style.top = cy + "px";
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); tip.hidden = true; });
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw)), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

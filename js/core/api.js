// Fetching prices from server.py locally, or the Cloudflare Worker on GitHub Pages.

// The GitHub Pages copy has no backend, so it uses the Cloudflare Worker in worker/.
const API = location.hostname.endsWith("github.io") ? "https://api.stockrepublic.workers.dev" : "";

const chartCache = new Map();

function getChart(sym, range) {
  const k = sym + "|" + range, hit = chartCache.get(k);
  if (hit && Date.now() - hit.at < 300000) return hit.req;
  const req = fetch(`${API}/api/chart?symbol=${encodeURIComponent(sym)}&range=${range}`)
    .then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); return d; })
    .catch(e => { chartCache.delete(k); throw e; });
  chartCache.set(k, { at: Date.now(), req });
  return req;
}

async function fetchQuotes(syms) {
  const batches = [];
  for (let i = 0; i < syms.length; i += 12) batches.push(syms.slice(i, i + 12));
  let failed = false;
  await Promise.all(batches.map(async b => {
    try {
      const r = await fetch(API + "/api/overview?symbols=" + encodeURIComponent(b.join(",")));
      Object.assign(state.overview, await r.json());
    } catch { failed = true; b.forEach(s => state.overview[s] = { error: "offline" }); }
    for (const [cur, sym] of Object.entries(FX)) {
      if (state.overview[sym]?.price) state.fx[cur] = state.overview[sym].price;
    }
    renderMain();
    if (detail.company && detail.data) renderPosition();
  }));
  return !failed;
}

async function loadOverview() {
  // Currency rates first, so portfolio values in euros are ready early.
  const extra = state.portfolio.map(p => p.symbol).filter(s => !COMPANIES.some(c => c.symbol === s));
  const ok = await fetchQuotes([...Object.values(FX), ...extra, ...COMPANIES.map(c => c.symbol)]);
  const failed = !ok;
  $("#status").textContent = failed
    ? "Couldn't load prices right now. Please try again later."
    : "Prices updated " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ". Cards show the last month.";
}

// Price per share in euros at the close of the given day (today: the latest price).
async function priceOn(sym, dateStr) {
  if (!dateStr || dateStr >= todayStr()) return priceEUR(sym);
  const t = new Date(dateStr + "T23:59:59").getTime() / 1000;
  const days = (Date.now() / 1000 - t) / 86400;
  const range = days < 360 ? "1y" : days < 1800 ? "5y" : "max";
  const d = await getChart(sym, range);
  const base = d.currency === "GBp" ? "GBP" : d.currency;
  if (base !== "EUR" && !FX[base]) return null;
  const fx = base === "EUR" ? null : await getChart(FX[base], range);
  const closeAt = pts => { let v = null; for (const [ts, c] of pts) { if (ts <= t) v = c; else break; } return v ?? pts[0]?.[1]; };
  const px = closeAt(d.points), rate = fx ? closeAt(fx.points) : 1;
  return px && rate ? norm(d.currency, px) * rate : null;
}

async function ensureQuote(sym) {
  if (state.overview[sym]?.price) return;
  const d = await getChart(sym, "1mo");
  state.overview[sym] = d;
}

// Stock Republic API: price proxy for the GitHub Pages site, deployed as a Cloudflare Worker.
// Same endpoints and response shape as server.py.

const YAHOO = "https://query1.finance.yahoo.com/v8/finance/chart/";
const ORIGIN = "https://yasingunaydiin.github.io";
const CACHE_SECONDS = 300;
const MAX_SYMBOLS = 20;
const SYMBOL = /^[A-Za-z0-9.^=-]{1,20}$/;

// Bar size that keeps each range readable without thousands of points.
const INTERVALS = { "1d": "5m", "5d": "30m", "1mo": "1d", "6mo": "1d", "ytd": "1d",
  "1y": "1d", "5y": "1wk", "max": "1mo" };

async function fetchChart(symbol, range) {
  if (!SYMBOL.test(symbol)) throw new Error("Invalid symbol");
  if (!INTERVALS[range]) throw new Error("Invalid range");
  const url = YAHOO + encodeURIComponent(symbol) + "?" + new URLSearchParams({ range, interval: INTERVALS[range] });
  // Cloudflare caches Yahoo's answer at the edge, so repeat visits don't hit Yahoo again.
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": CACHE_SECONDS, "404": CACHE_SECONDS, "400-599": 0 } },
  });
  if (!resp.ok) throw new Error("HTTP Error " + resp.status);
  const raw = await resp.json();
  const r = raw.chart?.result?.[0];
  if (!r) throw new Error("No data for " + symbol);
  const meta = r.meta;
  const quote = r.indicators.quote[0];
  const closes = quote.close || [];
  const points = (r.timestamp || []).map((t, i) => [t, closes[i]]).filter(([, c]) => c != null);
  return {
    symbol,
    name: meta.longName || meta.shortName || symbol,
    currency: meta.currency,
    exchange: meta.fullExchangeName,
    price: meta.regularMarketPrice,
    dayChangePct: meta.regularMarketChangePercent,
    high52: meta.fiftyTwoWeekHigh,
    low52: meta.fiftyTwoWeekLow,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    marketTime: meta.regularMarketTime,
    points,
  };
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ORIGIN },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const q = url.searchParams;
    if (url.pathname === "/api/chart") {
      try {
        return json(200, await fetchChart(q.get("symbol") || "", q.get("range") || "1y"));
      } catch (e) {
        return json(502, { error: e.message });
      }
    }
    if (url.pathname === "/api/overview") {
      // One month of daily closes for many symbols at once, for the cards.
      const symbols = (q.get("symbols") || "").split(",").filter(Boolean);
      if (symbols.length > MAX_SYMBOLS) return json(400, { error: "Too many symbols" });
      const entries = await Promise.all(symbols.map(async s => {
        try {
          const d = await fetchChart(s, "1mo");
          return [s, { name: d.name, price: d.price, currency: d.currency, dayChangePct: d.dayChangePct,
            marketTime: d.marketTime, points: d.points }];
        } catch (e) {
          return [s, { error: e.message }];
        }
      }));
      return json(200, Object.fromEntries(entries));
    }
    return json(404, { error: "Not found" });
  },
};

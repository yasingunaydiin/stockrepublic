// Converting prices to euros.

const FX = { USD: "USDEUR=X", GBP: "GBPEUR=X", CHF: "CHFEUR=X", DKK: "DKKEUR=X" };

// London prices come in pence (GBp); show pounds so they compare with other cards.
function norm(currency, v) { return currency === "GBp" ? v / 100 : v; }

// Everything is shown in euros. Multiplier from a quote's currency to EUR at today's rate.
function rateFor(cur) {
  if (cur === "EUR") return 1;
  const r = state.fx[cur === "GBp" ? "GBP" : cur];
  return r == null ? null : norm(cur, r);
}

// Converts each price point with the exchange rate at that moment, falling back to today's rate.
function pointsToEUR(points, cur, fxPoints) {
  if (cur === "EUR") return points;
  if (!fxPoints?.length) { const r = rateFor(cur); return r == null ? null : points.map(([t, v]) => [t, v * r]); }
  let j = 0;
  return points.map(([t, v]) => {
    while (j + 1 < fxPoints.length && fxPoints[j + 1][0] <= t) j++;
    return [t, norm(cur, v) * fxPoints[j][1]];
  });
}

const fxSymbolFor = cur => FX[cur === "GBp" ? "GBP" : cur];

// Current price in euros per share, using today's exchange rate.
function priceEUR(sym) {
  const o = state.overview[sym];
  if (!o || o.price == null) return null;
  const rate = rateFor(o.currency);
  return rate == null ? null : o.price * rate;
}

// One month of prices for a stock, in euros, plus the change over that month.
function monthEUR(sym) {
  const o = state.overview[sym];
  if (!o || o.error || rateFor(o.currency) == null) return null;
  const pts = pointsToEUR(o.points, o.currency, state.overview[fxSymbolFor(o.currency)]?.points);
  return { pts, price: o.price * rateFor(o.currency), chg: pts.length > 1 ? (pts.at(-1)[1] / pts[0][1] - 1) * 100 : 0 };
}

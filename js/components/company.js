// Building blocks for showing a company: avatar, sparkline, list row.

function companyFor(sym) {
  return COMPANIES.find(c => c.symbol === sym) || {
    sector: "other", symbol: sym, country: "", about: "",
    name: state.portfolio.find(p => p.symbol === sym)?.name || state.overview[sym]?.name || sym };
}

function initials(name) {
  const w = name.replace(/[^A-Za-z0-9 &]/g, "").split(/\s+/).filter(x => x && x !== "&");
  return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase();
}

function avatar(c) {
  const s = SECTORS.find(x => x.id === c.sector) || OTHER;
  return `<span class="avatar" style="--c:${s.color}" aria-hidden="true">${esc(initials(c.name))}</span>`;
}

function spark(points, up) {
  if (!points || points.length < 2) return "";
  const ys = points.map(p => p[1]), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
  const d = ys.map((y, i) => `${(i / (ys.length - 1) * 72).toFixed(1)},${(24 - (y - lo) / span * 22).toFixed(1)}`).join(" L");
  return `<svg viewBox="0 0 72 26" aria-hidden="true"><path d="M${d}" fill="none" stroke="var(--${up ? "up" : "down"})" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function row(c) {
  const o = state.overview[c.symbol], m = monthEUR(c.symbol), on = state.watch.has(c.symbol);
  const right = m
    ? `<span class="row-spark">${spark(m.pts, m.chg >= 0)}</span>
       <span class="row-price"><b>${money(m.price, "EUR")}</b><span class="chg ${m.chg >= 0 ? "up" : "down"}">${pct(m.chg)}</span></span>`
    : o?.error ? `<span class="row-spark"></span><span class="row-price"><span class="chg" style="color:var(--muted)">No price</span></span>`
    : `<span class="row-spark"><span class="skeleton"></span></span><span class="row-price"><span class="skeleton" style="width:64px"></span></span>`;
  return `<div class="row" role="button" tabindex="0" data-sym="${esc(c.symbol)}" aria-label="Open ${esc(c.name)}">
    ${avatar(c)}<span class="row-name"><b>${esc(c.name)}</b><small>${c.country ? c.country + " · " : ""}${esc(c.symbol)}</small></span>
    ${right}
    <button class="star ${on ? "on" : ""}" data-star="${esc(c.symbol)}" aria-label="${on ? "Remove from" : "Add to"} watchlist">${on ? "★" : "☆"}</button></div>`;
}

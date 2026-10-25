// Watchlist page.

function mixPanel(list) {
  const by = k => list.reduce((m, c) => (m[c[k]] = (m[c[k]] || 0) + 1, m), {});
  const sec = by("sector"), ctry = by("country");
  const bar = SECTORS.filter(s => sec[s.id]).map(s =>
    `<span style="flex:${sec[s.id]};background:${s.color}" title="${s.name}: ${sec[s.id]}"></span>`).join("");
  const legend = SECTORS.filter(s => sec[s.id]).map(s => `<span><i style="background:${s.color}"></i>${s.name} ${sec[s.id]}</span>`).join("");
  const nSec = Object.keys(sec).length;
  const tip = nSec === 1 ? "Everything here is in one sector. If that sector has a bad year, all of these could fall together. Spreading across sectors lowers that risk."
    : nSec < 4 ? `You cover ${nSec} of 6 sectors. Adding a defensive sector (pharma or consumer staples) can balance faster-moving ones.`
    : `Good spread across ${nSec} sectors. Mixing sectors means one bad industry hurts less.`;
  return `<div class="mix"><h3>Your watchlist mix</h3><div class="mixbar">${bar}</div>
    <div class="legend">${legend}</div>
    <div class="legend">Countries: ${Object.entries(ctry).map(([k, v]) => `${k} ${v}`).join(" · ")}</div>
    <p class="hint">${tip}</p></div>`;
}

function watchlistView() {
  const list = COMPANIES.filter(c => state.watch.has(c.symbol));
  return list.length
    ? mixPanel(list) + `<div class="block">${list.map(row).join("")}</div>`
    : `<div class="panel"><p class="empty">Your watchlist is empty. Go to Discover and tap ☆ next to any company to follow it here. It's saved in this browser.</p></div>`;
}

function toggleWatch(sym) {
  state.watch.has(sym) ? state.watch.delete(sym) : state.watch.add(sym);
  save("watch", [...state.watch]);
  renderChips(); renderMain(); syncWatchBtn();
}

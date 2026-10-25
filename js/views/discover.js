// Discover page: sector tiles and company lists.

function sectorTiles() {
  return `<div class="sectors" role="group" aria-label="Filter by sector">${SECTORS.map(s => {
    const ms = COMPANIES.filter(c => c.sector === s.id).map(c => monthEUR(c.symbol)).filter(Boolean);
    const avg = ms.length ? ms.reduce((a, m) => a + m.chg, 0) / ms.length : null;
    return `<button class="sector-tile" data-sector="${s.id}" aria-pressed="${state.filter === s.id}" style="--c:${s.color}">
      <span class="dot"></span><span class="label">${s.name}</span>
      <span class="avg ${avg == null ? "" : avg >= 0 ? "up" : "down"}">${avg == null ? "…" : pct(avg)}</span>
      <small>avg. last month · ${s.trait}</small></button>`;
  }).join("")}</div>`;
}

function discoverView() {
  const q = state.query.toLowerCase();
  const match = c => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q);
  let html = sectorTiles();
  if (state.filter !== "all") {
    html += `<div class="filter-note">Showing ${SECTORS.find(s => s.id === state.filter).name} only. <button class="textbtn" data-sector="all">Show all sectors</button></div>`;
  }
  let blocks = "";
  for (const s of SECTORS) {
    if (state.filter !== "all" && state.filter !== s.id) continue;
    const list = COMPANIES.filter(c => c.sector === s.id && match(c));
    if (!list.length) continue;
    blocks += `<section class="block"><div class="block-head"><h2>${s.name}<span class="trait">${s.trait}</span></h2>
      <p>${s.blurb}</p></div>${list.map(row).join("")}</section>`;
  }
  return html + (blocks ? `<div class="lists">${blocks}</div>` : `<p class="empty">No company matches “${esc(state.query)}”.</p>`);
}

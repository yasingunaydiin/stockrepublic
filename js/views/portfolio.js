// Portfolio page and the totals behind it.

function position(p) {
  const px = priceEUR(p.symbol), o = state.overview[p.symbol];
  const invested = p.shares * p.avg;
  const value = px == null ? null : p.shares * px;
  const gain = value == null ? null : value - invested;
  const today = value == null || o?.dayChangePct == null ? null : value - value / (1 + o.dayChangePct / 100);
  return { ...p, company: companyFor(p.symbol), px, invested, value, gain, gainPct: gain == null ? null : gain / invested * 100, today };
}

function totals() {
  const rows = state.portfolio.map(position);
  const priced = rows.filter(r => r.value != null);
  const invested = rows.reduce((a, r) => a + r.invested, 0);
  const pricedInvested = priced.reduce((a, r) => a + r.invested, 0);
  const value = priced.reduce((a, r) => a + r.value, 0);
  const today = priced.reduce((a, r) => a + (r.today || 0), 0);
  // On weekends and holidays the "day change" belongs to the last trading day, not today.
  const last = Math.max(0, ...rows.map(r => state.overview[r.symbol]?.marketTime || 0));
  const tradedToday = last && new Date(last * 1000).toDateString() === new Date().toDateString();
  const dayLabel = !last || tradedToday ? "Today" : "Last trading day";
  const dayNote = !last || tradedToday ? "" : new Date(last * 1000).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + " · markets closed now";
  return { rows, dayLabel, dayNote, invested, value, gain: value - pricedInvested, gainPct: pricedInvested ? (value / pricedInvested - 1) * 100 : 0,
    today, todayPct: value ? today / (value - today) * 100 : 0, complete: priced.length === rows.length };
}

function renderSummary() {
  const el = $("#pfSummary");
  if (!state.portfolio.length) { el.hidden = true; return; }
  const t = totals();
  el.hidden = false;
  el.innerHTML = `<small>Portfolio value</small><b>${eur(t.value)}</b><span class="${tone(t.gain)}">${eur(t.gain, true)} (${pct(t.gainPct)})</span>`;
}

function portfolioView() {
  const t = totals();
  if (!state.portfolio.length) {
    return `<div class="panel"><h3>Track what you own</h3>
      <p class="hint" style="max-width:65ch">Add what you've bought in Trade Republic to see how much you invested, what it's worth today and how much you've gained or lost. Everything stays in this browser on your Mac. Nothing is sent to Trade Republic or anyone else.</p></div>
      <div class="panel" id="pfFormPanel">${posForm()}</div>`;
  }
  const rows = t.rows.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map(r => `<div class="hold">
    ${avatar(r.company)}
    <span class="row-name" data-open="${esc(r.symbol)}" role="button" tabindex="0"><b>${esc(r.company.name)}</b>
      <small>${fmtShares(r.shares)} shares · bought at ${eur(r.avg)} · now ${eur(r.px)}</small></span>
    <span class="hold-val"><b>${eur(r.value)}</b><span class="chg ${tone(r.gain)}">${eur(r.gain, true)} (${pct(r.gainPct)})</span></span>
    <span class="hold-actions"><button class="mini" data-edit="${esc(r.symbol)}">Edit</button><button class="mini" data-remove="${esc(r.symbol)}">Remove</button></span>
  </div>`).join("");
  const sectors = [...SECTORS, OTHER];
  const bySector = {};
  t.rows.forEach(r => bySector[r.company.sector] = (bySector[r.company.sector] || 0) + (r.value ?? r.invested));
  const total = Object.values(bySector).reduce((a, b) => a + b, 0) || 1;
  const used = sectors.filter(s => bySector[s.id]);
  const biggest = t.rows.reduce((m, r) => (r.value ?? 0) > (m?.value ?? 0) ? r : m, null);
  const biggestShare = biggest && t.value ? biggest.value / t.value * 100 : 0;
  let advice = used.length === 1 ? "All your money is in one sector, so one bad year for that industry hits everything you own."
    : `Your money is spread over ${used.length} sectors.`;
  if (biggestShare > 40 && t.rows.length > 1) advice += ` ${esc(biggest.company.name)} makes up ${biggestShare.toFixed(0)}% of your portfolio. A big drop there would hurt your total a lot.`;
  return `<section class="hero" aria-label="Portfolio summary">
      <small>Worth now${t.complete ? "" : " (some prices still loading)"}</small>
      <div class="value">${eur(t.value)}</div>
      <div class="lines">
        <span class="${tone(t.gain)}">${eur(t.gain, true)} (${pct(t.gainPct)})<small>since you bought</small></span>
        <span class="${tone(t.today)}">${eur(t.today, true)} (${pct(t.todayPct)})<small>${t.dayLabel === "Today" ? "today" : "last trading day, " + t.dayNote}</small></span>
      </div>
    </section>
    <div class="facts">
      <div class="fact"><small>Money invested</small><b>${eur(t.invested)}</b></div>
      <div class="fact"><small>Positions</small><b>${t.rows.length}</b></div>
      <div class="fact"><small>Biggest position</small><b>${biggest ? esc(biggest.company.name) : "–"}</b></div>
    </div>
    <div class="block" style="padding:8px">${rows}</div>
    <div class="mix"><h3>Where your money is</h3>
      <div class="mixbar">${used.map(s => `<span style="flex:${bySector[s.id]};background:${s.color}" title="${s.name}"></span>`).join("")}</div>
      <div class="legend">${used.map(s => `<span><i style="background:${s.color}"></i>${s.name} ${(bySector[s.id] / total * 100).toFixed(0)}%</span>`).join("")}</div>
      <p class="hint">${advice}</p></div>
    <div class="panel" id="pfFormPanel">${posForm(state.editing)}</div>
    <p class="hint">Numbers can differ slightly from the Trade Republic app, which uses its own exchange prices and doesn't count dividends as gain. Your positions are saved only in this browser.</p>`;
}

function renderPortfolio() {
  // Keep anything typed into the form when prices arrive and the view redraws.
  const ids = ["pfSymbol", "pfTicker", "pfAmount", "pfDate", "pfShares", "pfTotal", "pfAvg"];
  const typed = ids.map(id => document.getElementById(id)?.value);
  const wrapHidden = document.getElementById("pfTickerWrap")?.hidden;
  const mode = document.querySelector('input[name="pfMode"]:checked')?.value;
  $("#main").innerHTML = portfolioView();
  ids.forEach((id, i) => { const el = document.getElementById(id); if (el && typed[i] != null) el.value = typed[i]; });
  if (wrapHidden != null && $("#pfTickerWrap")) $("#pfTickerWrap").hidden = wrapHidden;
  if (mode && $("#posForm")) { $(`input[name="pfMode"][value="${mode}"]`).checked = true; applyMode(mode); }
}

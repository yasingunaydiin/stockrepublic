// The company detail sheet that slides in from the right.

const detail = { company: null, range: "1y", data: null, req: 0 };

function openDetail(sym) {
  detail.company = companyFor(sym);
  detail.editingPos = false;
  detail.data = null;
  detail.range = load("range", "1y");
  const c = detail.company, s = SECTORS.find(x => x.id === c.sector) || OTHER;
  $("#scrim").innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(c.name)}"><div class="sheet-inner">
    <div class="sheet-top"><div class="sheet-id">${avatar(c)}<div><h2>${esc(c.name)}</h2>
      <div class="sub">${s.name}${c.country ? " · " + c.country : ""} · <span class="num">${esc(c.symbol)}</span> <span id="exch"></span></div></div></div>
      <button class="close" id="closeBtn" aria-label="Close">✕</button></div>
    ${c.about ? `<p class="about">${esc(c.about)}</p>` : ""}
    <div class="headline" id="headline"></div>
    <div class="panel"><div class="ranges" id="ranges"></div><div class="chart" id="chart"><div class="msg">Loading chart…</div></div></div>
    <div class="panel" id="position"></div>
    <div class="panel" id="stats"></div>
    <div class="panel story" id="story"></div>
    <div class="panel tr"><span>Find it in Trade Republic: search</span><code>${esc(c.name)}</code>
      <button class="chip" id="watchBtn" style="margin-left:auto"></button></div>
  </div></div>`;
  $("#scrim").hidden = false;
  document.body.style.overflow = "hidden";
  syncWatchBtn();
  renderRanges();
  renderPosition();
  loadDetail();
  $("#closeBtn").focus();
}

function closeDetail() { $("#scrim").hidden = true; $("#scrim").innerHTML = ""; document.body.style.overflow = ""; detail.company = null; }

function syncWatchBtn() {
  const b = $("#watchBtn"); if (!b) return;
  const on = state.watch.has(detail.company.symbol);
  b.textContent = on ? "★ On your watchlist" : "☆ Add to watchlist";
  b.setAttribute("aria-pressed", on);
}

function renderRanges() {
  $("#ranges").innerHTML = RANGES.map(([l, v]) => `<button data-range="${v}" aria-pressed="${v === detail.range}">${l}</button>`).join("");
}

async function loadDetail() {
  const id = ++detail.req, c = detail.company;
  $("#chart").innerHTML = `<div class="msg">Loading chart…</div>`;
  try {
    const d = await getChart(c.symbol, detail.range);
    // Same range of exchange rates, so the chart shows what a euro investor saw each day.
    const fxSym = fxSymbolFor(d.currency);
    const fx = fxSym ? await getChart(fxSym, detail.range).catch(() => null) : null;
    if (id !== detail.req) return;
    const r = d.currency === "EUR" ? 1 : fx?.price != null ? norm(d.currency, fx.price) : rateFor(d.currency);
    if (r == null) throw new Error("No exchange rate for " + d.currency);
    const conv = v => v == null ? v : v * r;
    detail.data = { ...d, currency: "EUR", origCurrency: d.currency, origPrice: d.price, fxRate: r,
      price: conv(d.price), high52: conv(d.high52), low52: conv(d.low52), dayHigh: conv(d.dayHigh), dayLow: conv(d.dayLow),
      points: pointsToEUR(d.points, d.currency, fx?.points) };
    renderDetail();
  } catch (e) {
    if (id !== detail.req) return;
    $("#chart").innerHTML = `<div class="msg">Couldn't load the chart right now. Check that you're online, then pick a range again.</div>`;
  }
}

function renderPosition() {
  const el = $("#position"); if (!el) return;
  const sym = detail.company.symbol;
  const p = state.portfolio.find(x => x.symbol === sym);
  if (detail.editingPos) { if (!el.querySelector("#posForm")) el.innerHTML = posForm(sym, true); return; }
  if (!p) {
    el.innerHTML = `<div class="own"><span class="hint" style="flex:1 1 260px">Bought this in Trade Republic? Add it to track your gain or loss and see your buy price on the chart.</span>
      <button class="chip solid" data-addpos>Add to portfolio</button></div>`;
    return;
  }
  const r = position(p);
  el.innerHTML = `<h3>Your position</h3><div class="own">
    <div class="stat"><dt>Shares</dt><dd>${fmtShares(r.shares)}</dd></div>
    <div class="stat"><dt>Invested</dt><dd>${eur(r.invested)}</dd></div>
    <div class="stat"><dt>Worth now</dt><dd>${eur(r.value)}</dd></div>
    <div class="stat"><dt>Gain / loss</dt><dd class="${tone(r.gain)}">${eur(r.gain, true)} (${pct(r.gainPct)})</dd></div>
    ${p.buys?.length ? `<div class="stat"><dt>${p.buys.length > 1 ? "First bought" : "Bought"}</dt><dd>${fmtDay(p.buys[0].date)}</dd></div>` : ""}
    <button class="mini" data-addpos style="margin-left:auto">Edit or buy more</button></div>
    ${p.buys?.length ? "" : `<p class="hint" style="margin:10px 0 0">Add the date you bought it (Edit → Correct shares &amp; price) to see it as a dot on the chart.</p>`}`;
}

function renderDetail() {
  const d = detail.data, c = detail.company, cur = d.currency, range = detail.range;
  $("#exch").textContent = d.exchange ? "· " + d.exchange : "";
  if (!d.points || d.points.length < 2) {
    $("#chart").innerHTML = `<div class="msg">No trades in this period yet. The market may be closed. Try 5D or 1M.</div>`;
    $("#headline").innerHTML = `<span class="big">${money(d.price, cur)}</span>`;
    return;
  }
  const a = analyse(d, range);
  const words = RANGE_WORDS[range];
  const orig = d.origCurrency && d.origCurrency !== "EUR"
    ? `<span class="hint" style="width:100%">Trades as ${money(d.origPrice, d.origCurrency)} on ${esc(d.exchange || "its home exchange")}. Converted to euros with each day's exchange rate, so the chart includes currency moves.</span>` : "";
  $("#headline").innerHTML = `<span class="big">${money(d.price, cur)}</span>${pill(a.change)}
    <span class="meta" style="color:var(--muted)">over ${words}</span>${orig}`;
  // Your average buy price, converted from euros into the chart's currency.
  const own = state.portfolio.find(p => p.symbol === c.symbol);
  const rate = state.fx[cur === "GBp" ? "GBP" : cur];
  drawChart(d.points, cur, range, a.change >= 0, own && rate ? own.avg / rate : null, (own?.buys || []).map(b => b.date));
  renderPosition();

  const pos = d.high52 > d.low52 ? Math.min(100, Math.max(0, (d.price - d.low52) / (d.high52 - d.low52) * 100)) : 50;
  const volLabel = a.vol == null ? null : a.vol < 22 ? "Calm" : a.vol < 38 ? "Moderate" : "Bumpy";
  $("#stats").innerHTML = `<dl class="stats">
    <div class="stat"><dt>Today ${q("today")}</dt><dd>${pill(d.dayChangePct ?? 0)}</dd></div>
    <div class="stat"><dt>Day range ${q("dayrange")}</dt><dd>${money(d.dayLow, cur)} – ${money(d.dayHigh, cur)}</dd></div>
    <div class="stat"><dt>Biggest drop ${q("drawdown")}</dt><dd>${pct(a.dd)}</dd></div>
    ${volLabel ? `<div class="stat"><dt>Price swings ${q("vol")}</dt><dd>${volLabel} <span style="color:var(--muted);font-size:13px">(${a.vol.toFixed(0)}%/yr)</span></dd></div>` : ""}
  </dl>
  <div style="margin-top:14px"><div class="stat"><dt>52-week range ${q("range52")}</dt></div>
    <div class="range52"><b style="left:${pos}%"></b></div>
    <div class="range52-labels"><span>Low ${money(d.low52, cur)}</span><span>High ${money(d.high52, cur)}</span></div>
    <p class="explain">Today's price sits ${pos < 25 ? "near the bottom" : pos > 75 ? "near the top" : "in the middle"} of its range over the last 12 months.</p></div>
  <p class="explain" id="qExplain" hidden></p>`;

  const invested = 1000, now = invested * (1 + a.change / 100);
  const sym = SYMBOLS[cur] ?? cur + " ";
  const peakDate = fmtDate(a.ddPeak, range === "1d" ? "1d" : "1y"), troughDate = fmtDate(a.troughAt, range === "1d" ? "1d" : "1y");
  const items = [
    `The price ${a.change >= 0 ? "rose" : "fell"} <b>${pct(a.change)}</b> over ${words}, from ${money(a.first, cur)} to ${money(a.last, cur)}.`,
    `If you had put ${sym}${invested.toLocaleString()} in at the start, it would be worth about <b>${sym}${Math.round(now).toLocaleString()}</b> now, before fees, dividends and currency effects.`,
  ];
  if (a.dd < -3) items.push(`Along the way it fell as much as <b>${pct(a.dd)}</b> from a high (${peakDate} to ${troughDate}). Investors who held on had to sit through that drop. Ask yourself whether you could too.`);
  else items.push(`It never fell more than ${Math.abs(a.dd).toFixed(1)}% from a high in this period, which is a smooth ride.`);
  if (volLabel) items.push(volLabel === "Bumpy"
    ? "Daily moves are large for this stock. Expect sharp ups and downs, so consider a small position or buying gradually with a savings plan."
    : volLabel === "Calm" ? "Daily moves are fairly small. Stocks like this tend to be steadier, though nothing is risk-free."
    : "Daily moves are about average for a large company.");
  if (range === "1d" || range === "5d") items.push("Short ranges show a lot of noise. Switch to 1Y or 5Y to see the bigger trend.");
  $("#story").innerHTML = `<h3>What this chart tells you</h3><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
}

const HELP = {
  today: "How much the price moved since yesterday's close.",
  dayrange: "The lowest and highest price traded today.",
  drawdown: "The largest fall from a high point to a later low within the chosen period. It shows the worst stretch an investor would have lived through.",
  vol: "Volatility: how much the price jumps around, as a yearly figure. Under ~22% is calm for a single stock; above ~38% is bumpy.",
  range52: "The lowest and highest price over the last 12 months. It gives context: a stock near its low isn't automatically cheap, and one near its high isn't automatically expensive.",
};

function q(k) { return `<button class="q" data-help="${k}" aria-label="What does this mean?">?</button>`; }

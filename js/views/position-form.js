// The form for adding or editing a position.

function posForm(sym, locked) {
  const p = state.portfolio.find(x => x.symbol === sym);
  const known = !sym || COMPANIES.some(c => c.symbol === sym);
  const mode = p ? "shares" : "amount";
  const opts = SECTORS.map(s => `<optgroup label="${s.name}">${COMPANIES.filter(c => c.sector === s.id)
    .map(c => `<option value="${c.symbol}" ${c.symbol === sym ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</optgroup>`).join("");
  return `<form class="pos" id="posForm" novalidate>
    <h3>${p ? esc(companyFor(sym).name) + ": add a purchase or correct your position" : "Add an investment"}</h3>
    <div class="modes" role="radiogroup" aria-label="How do you want to enter it?">
      <label><input type="radio" name="pfMode" value="amount" ${mode === "amount" ? "checked" : ""}> ${p ? "I bought more" : "I invested an amount"}</label>
      <label><input type="radio" name="pfMode" value="shares" ${mode === "shares" ? "checked" : ""}> ${p ? "Correct shares & price" : "I'll enter my shares"}</label>
    </div>
    ${locked ? `<input type="hidden" id="pfSymbol" value="${esc(sym)}">` : `<div class="fields"><label class="field">Company
        <select id="pfSymbol"><option value="">Choose…</option>${opts}
        <option value="__other" ${!known ? "selected" : ""}>Other stock or ETF…</option></select></label>
      <label class="field" id="pfTickerWrap" ${known ? "hidden" : ""}>Yahoo Finance ticker
        <input id="pfTicker" placeholder="e.g. EUNL.DE" value="${!known ? esc(sym) : ""}" autocapitalize="characters"></label></div>`}
    <div data-mode="amount" class="fields" ${mode !== "amount" ? "hidden" : ""}>
      <label class="field">Amount invested (€)<input id="pfAmount" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 200"></label>
      <label class="field">Date bought<input id="pfDate" type="date" max="${todayStr()}" value="${todayStr()}"></label>
    </div>
    <p class="hint" data-mode="amount" ${mode !== "amount" ? "hidden" : ""}>Enter what you paid and when. The app works out how many shares that bought at that day's price, so your investment starts at exactly the amount you put in and then moves with the market.</p>
    <div data-mode="shares" class="fields" ${mode !== "shares" ? "hidden" : ""}>
      <label class="field">Number of shares<input id="pfShares" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 1.05" value="${p ? +p.shares.toFixed(6) : ""}"></label>
      <label class="field">Total invested (€)<input id="pfTotal" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 200" value="${p ? +(p.shares * p.avg).toFixed(2) : ""}"></label>
      <label class="field">Avg. buy price per share (€)<input id="pfAvg" type="number" inputmode="decimal" step="any" min="0" placeholder="e.g. 188.50" value="${p ? +p.avg.toFixed(4) : ""}"></label>
    </div>
    <p class="hint" data-mode="shares" ${mode !== "shares" ? "hidden" : ""}>Copy these from Trade Republic: tap the stock in your portfolio. Fill in any two and the third is calculated. ${priceHint(sym)}</p>
    <p class="hint" id="pfPreview"></p>
    <div class="form-actions"><button class="btn" type="submit" id="pfSubmit">${submitLabel(mode, p)}</button>
      ${p || locked ? `<button class="btn ghost" type="button" data-cancel>Cancel</button>` : ""}
      <span class="form-msg" id="pfMsg" role="status"></span>
      ${p ? `<button class="mini" type="button" data-remove="${esc(sym)}" style="margin-left:auto">Remove position</button>` : ""}</div>
  </form>`;
}

function submitLabel(mode, p) { return mode === "amount" ? (p ? "Add this purchase" : "Add to portfolio") : (p ? "Save changes" : "Add to portfolio"); }

function applyMode(mode) {
  const f = $("#posForm"); if (!f) return;
  f.querySelectorAll("[data-mode]").forEach(el => el.hidden = el.dataset.mode !== mode);
  const sym = f.querySelector("#pfSymbol").value;
  f.querySelector("#pfSubmit").textContent = submitLabel(mode, state.portfolio.find(x => x.symbol === sym));
  updatePreview();
}

function priceHint(sym) {
  const px = sym && sym !== "__other" ? priceEUR(sym) : null;
  return px ? `${esc(companyFor(sym).name)} trades at about ${eur(px)} per share right now.` : "";
}

// Shares, total and average: whichever two the user typed last decide the third.
function syncAmounts(changed) {
  const f = $("#posForm"); if (!f) return;
  const num = id => parseFloat(f.querySelector(id).value.replace(",", "."));
  const set = (id, v) => { f.querySelector(id).value = isFinite(v) && v > 0 ? +v.toFixed(4) : ""; };
  if (changed !== "pfShares") f.dataset.last = changed;
  const shares = num("#pfShares"), total = num("#pfTotal"), avg = num("#pfAvg");
  if (changed === "pfTotal" && shares > 0) set("#pfAvg", total / shares);
  else if (changed === "pfAvg" && shares > 0) set("#pfTotal", shares * avg);
  else if (changed === "pfShares" && shares > 0) {
    if (f.dataset.last === "pfAvg" && avg > 0) set("#pfTotal", shares * avg);
    else if (total > 0) set("#pfAvg", total / shares);
  }
}

let previewReq = 0;

async function updatePreview() {
  const f = $("#posForm"); if (!f) return;
  const out = f.querySelector("#pfPreview");
  const mode = f.querySelector('input[name="pfMode"]:checked')?.value;
  const sym = f.querySelector("#pfSymbol").value;
  const amount = parseFloat(f.querySelector("#pfAmount").value.replace(",", "."));
  const date = f.querySelector("#pfDate").value;
  if (mode !== "amount" || !sym || sym === "__other" || !(amount > 0)) { out.textContent = ""; return; }
  const id = ++previewReq;
  let px = null;
  try { px = await priceOn(sym, date); } catch {}
  if (id !== previewReq) return;
  out.innerHTML = px
    ? `${eur(amount)} bought about <b>${(amount / px).toLocaleString("en-US", { maximumFractionDigits: 4 })} shares</b> at ${eur(px)} each${date && date < todayStr() ? " (closing price that day)" : ""}.`
    : "Couldn't find a price for that day yet.";
}

async function submitPosition(form) {
  const msg = form.querySelector("#pfMsg");
  const num = id => parseFloat(form.querySelector(id).value.replace(",", "."));
  const mode = form.querySelector('input[name="pfMode"]:checked')?.value || "shares";
  let sym = form.querySelector("#pfSymbol").value;
  if (sym === "__other") sym = form.querySelector("#pfTicker").value.trim().toUpperCase();
  if (!sym) return msg.textContent = "Choose a company first.";
  const existing = state.portfolio.find(p => p.symbol === sym);
  let shares, avg;
  if (mode === "amount") {
    const amount = num("#pfAmount"), date = form.querySelector("#pfDate").value;
    if (!(amount > 0)) return msg.textContent = "Enter how much you invested in euros, for example 200.";
    if (date > todayStr()) return msg.textContent = "The date can't be in the future.";
    msg.textContent = "Working out your shares…";
    try { await ensureQuote(sym); } catch {
      return msg.textContent = `Couldn't find “${sym}”. Use the Yahoo Finance code, e.g. EUNL.DE for the iShares MSCI World ETF.`;
    }
    let px = null;
    try { px = await priceOn(sym, date); } catch {}
    if (!px) return msg.textContent = "Couldn't get the price for that day. Try another date, or enter your shares instead.";
    shares = amount / px; avg = px;
    // Buying more of something you own: combine into one position with a new average price.
    if (existing) { avg = (existing.shares * existing.avg + amount) / (existing.shares + shares); shares += existing.shares; }
  } else {
    shares = num("#pfShares");
    const total = num("#pfTotal");
    avg = num("#pfAvg");
    if (!(shares > 0)) return msg.textContent = "Enter how many shares you own, for example 1.05.";
    if (!(avg > 0) && total > 0) avg = total / shares;
    if (!(avg > 0)) return msg.textContent = "Enter the total you invested or your average buy price per share.";
    try { await ensureQuote(sym); } catch {
      return msg.textContent = `Couldn't find “${sym}”. Use the Yahoo Finance code, e.g. EUNL.DE for the iShares MSCI World ETF.`;
    }
  }
  const entry = { symbol: sym, name: companyFor(sym).name !== sym ? companyFor(sym).name : state.overview[sym]?.name || sym, shares, avg };
  const i = state.portfolio.findIndex(p => p.symbol === sym);
  if (i >= 0) state.portfolio[i] = entry; else state.portfolio.push(entry);
  save("portfolio", state.portfolio);
  state.editing = null;
  renderChips(); renderMain();
  if (detail.company) { detail.editingPos = false; renderPosition(); if (detail.data) renderDetail(); }
}

function removePosition(sym, btn) {
  if (btn.dataset.armed !== "1") { btn.dataset.armed = "1"; btn.textContent = "Click again to remove"; btn.classList.add("danger"); return false; }
  state.portfolio = state.portfolio.filter(p => p.symbol !== sym);
  save("portfolio", state.portfolio);
  if (state.editing === sym) state.editing = null;
  renderChips(); renderMain();
  return true;
}

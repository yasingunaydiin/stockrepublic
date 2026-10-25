// Click, input and keyboard handlers.

$("#tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-view]"); if (b) setView(b.dataset.view);
});
$("#pfSummary").addEventListener("click", () => setView("portfolio"));
$("#pageHead").addEventListener("input", e => {
  if (e.target.id === "search") { state.query = e.target.value.trim(); renderMain(); }
});
document.addEventListener("submit", e => {
  if (e.target.id === "posForm") { e.preventDefault(); submitPosition(e.target); }
});
document.addEventListener("change", e => {
  if (e.target.id === "pfSymbol") {
    $("#pfTickerWrap").hidden = e.target.value !== "__other";
    applyMode($('input[name="pfMode"]:checked').value);
  }
  if (e.target.name === "pfMode") applyMode(e.target.value);
  if (e.target.id === "pfDate") updatePreview();
});
document.addEventListener("input", e => {
  if (["pfShares", "pfTotal", "pfAvg"].includes(e.target.id)) syncAmounts(e.target.id);
  if (e.target.id === "pfAmount") updatePreview();
});
$("#main").addEventListener("click", e => {
  const t = e.target;
  const sec = t.closest("[data-sector]");
  if (sec) { state.filter = sec.dataset.sector === state.filter ? "all" : sec.dataset.sector; renderMain(); return; }
  if (t.closest("[data-remove]")) return removePosition(t.closest("[data-remove]").dataset.remove, t.closest("[data-remove]"));
  if (t.closest("[data-edit]")) {
    state.editing = t.closest("[data-edit]").dataset.edit;
    $("#main").innerHTML = portfolioView();
    $("#pfFormPanel").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (t.closest("[data-cancel]")) { state.editing = null; $("#main").innerHTML = portfolioView(); return; }
  if (t.closest("[data-open]")) return openDetail(t.closest("[data-open]").dataset.open);
  const s = t.closest("[data-star]");
  if (s) { e.stopPropagation(); toggleWatch(s.dataset.star); return; }
  const c = t.closest("[data-sym]"); if (c) openDetail(c.dataset.sym);
});
$("#main").addEventListener("keydown", e => {
  const c = e.target.closest("[data-sym], [data-open]");
  if (c && e.target === c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDetail(c.dataset.sym || c.dataset.open); }
});
$("#scrim").addEventListener("click", e => {
  if (e.target.id === "scrim" || e.target.closest("#closeBtn")) return closeDetail();
  if (e.target.closest("#watchBtn")) return toggleWatch(detail.company.symbol);
  if (e.target.closest("[data-addpos]")) { detail.editingPos = true; renderPosition(); $("#posForm [data-mode]:not([hidden]) input")?.focus(); return; }
  if (e.target.closest("[data-cancel]")) { detail.editingPos = false; renderPosition(); return; }
  const rm = e.target.closest("[data-remove]");
  if (rm) {
    if (removePosition(rm.dataset.remove, rm)) { detail.editingPos = false; detail.data ? renderDetail() : renderPosition(); }
    return;
  }
  const r = e.target.closest("[data-range]");
  if (r) { detail.range = r.dataset.range; save("range", detail.range); renderRanges(); loadDetail(); return; }
  const h = e.target.closest("[data-help]");
  if (h) { const p = $("#qExplain"); p.hidden = false; p.innerHTML = `<b>${h.parentElement.firstChild.textContent.trim()}:</b> ${HELP[h.dataset.help]}`; }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#scrim").hidden) closeDetail(); });
let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => detail.company && detail.data && renderDetail(), 150); });

// Formatting money, percentages and dates.

const SYMBOLS = { USD:"$", EUR:"€", GBp:"£", GBP:"£", CHF:"CHF ", DKK:"DKK " };

function money(v, cur, digits) {
  if (v == null) return "–";
  v = norm(cur, v);
  const d = digits ?? (v >= 1000 ? 0 : 2);
  return (SYMBOLS[cur] ?? (cur + " ")) + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function pct(v) { return v == null ? "–" : (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%"; }

function pill(v) { return `<span class="pill ${v >= 0 ? "up" : "down"}">${pct(v)}</span>`; }

const eur = (v, signed) => v == null || isNaN(v) ? "–"
  : (signed ? (v >= 0 ? "+" : "−") : v < 0 ? "−" : "") + "€" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tone = v => v >= 0 ? "gain" : "loss";

const fmtShares = n => (+n).toLocaleString("en-US", { maximumFractionDigits: 4 });

const todayStr = () => new Date().toLocaleDateString("en-CA");
// "2026-10-27" → "27 Oct 2026"
const fmtDay = s => new Date(s + "T12:00:00").toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

function fmtDate(t, range) {
  const d = new Date(t * 1000);
  if (range === "1d") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "5d") return d.toLocaleDateString([], { weekday: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

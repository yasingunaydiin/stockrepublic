// App state and the helpers everything else uses.

const $ = s => document.querySelector(s);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }

function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

const state = { view: load("view", "discover"), filter: "all", query: "", overview: {}, watch: new Set(load("watch", [])),
  portfolio: load("portfolio", []), fx: { EUR: 1 }, editing: null };

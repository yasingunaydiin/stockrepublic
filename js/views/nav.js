// Tabs, page headers and switching between pages.

const ICONS = {
  discover: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  portfolio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>',
  watch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
  learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H7a2 2 0 0 0-2 2z"/><path d="M5 20a2 2 0 0 0 2 2h12v-4"/></svg>',
};

const VIEWS = [["discover", "Discover"], ["portfolio", "Portfolio"], ["watch", "Watchlist"], ["learn", "Learn"]];

function renderChips() {
  const counts = { portfolio: state.portfolio.length, watch: state.watch.size };
  $("#tabs").innerHTML = VIEWS.map(([id, label]) =>
    `<button class="tab" data-view="${id}" ${state.view === id ? 'aria-current="page"' : ""}>${ICONS[id]}<span>${label}</span>${counts[id] ? `<span class="count">${counts[id]}</span>` : ""}</button>`).join("");
}

function renderHead() {
  const heads = {
    discover: `<div><h1>Discover</h1><p>72 well-known companies in six sectors, with the last month's move. Tap a company for its full chart, explained in plain language.</p></div>
      <input class="search" id="search" type="search" placeholder="Search company" aria-label="Search company" value="${esc(state.query)}">`,
    portfolio: `<div><h1>Portfolio</h1><p>What you've invested through Trade Republic, and what it's worth today.</p></div>`,
    watch: `<div><h1>Watchlist</h1><p>Companies you're keeping an eye on. Tap ☆ on any company to add it.</p></div>`,
    learn: `<div><h1>Learn</h1><p>A short, plain-language primer for your first investments. Not financial advice.</p></div>`,
  };
  $("#pageHead").innerHTML = heads[state.view];
}

function setView(v) {
  state.view = v; state.editing = null;
  save("view", v);
  renderChips(); renderHead(); renderMain();
  window.scrollTo({ top: 0 });
}

function renderMain() {
  renderSummary();
  if (state.view === "portfolio") return renderPortfolio();
  const views = { discover: discoverView, watch: watchlistView, learn: learnView };
  $("#main").innerHTML = views[state.view]();
}

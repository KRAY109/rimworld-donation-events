const cfg = window.RIM_DONATIONS_CONFIG || {};
const state = { events: [], category: "Все", query: "" };
const els = {
  events: document.querySelector("#events"), featured: document.querySelector("#featured-events"), featuredWrap: document.querySelector("#featured-wrap"),
  categories: document.querySelector("#categories"), search: document.querySelector("#search"),
  eventDialog: document.querySelector("#event-dialog"), helpDialog: document.querySelector("#help-dialog"),
  title: document.querySelector("#modal-title"), category: document.querySelector("#modal-category"), description: document.querySelector("#modal-description"),
  price: document.querySelector("#modal-price"), command: document.querySelector("#modal-command"), note: document.querySelector("#modal-note"), copy: document.querySelector("#copy-command")
};
let selected = null;
const money = value => new Intl.NumberFormat("ru-RU").format(value) + " ₽";
const ruSort = (a, b) => a.title.localeCompare(b.title, "ru", { sensitivity: "base" });

document.title = cfg.pageTitle || document.title;
document.querySelector("#page-title").textContent = cfg.pageTitle || "Донат-ивенты";
document.querySelector("#streamer-name").textContent = cfg.streamerName || "";
for (const id of ["donate-top", "donate-modal"]) document.querySelector(`#${id}`).href = cfg.donationUrl || "#";
document.querySelector("#how-it-works").addEventListener("click", () => els.helpDialog.showModal());
els.search.addEventListener("input", event => { state.query = event.target.value.trim().toLowerCase(); render(); });
els.copy.addEventListener("click", async () => {
  if (!selected) return;
  await navigator.clipboard.writeText(selected.command + " ");
  els.copy.textContent = "Скопировано";
  setTimeout(() => els.copy.textContent = "Скопировать команду", 1200);
});

fetch("events.json?v=335", { cache: "no-store" })
  .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then(data => {
    state.events = data.events.filter(isDlcEnabled);
    renderCategories(); render();
  })
  .catch(error => { els.events.innerHTML = `<p class="empty">Не удалось загрузить прайс: ${escapeHtml(error.message)}</p>`; });

function isDlcEnabled(item) {
  if (!item.requiresDlc) return true;
  const enabled = cfg.enabledDlc || {};
  return enabled[item.requiresDlc] !== false;
}

function renderCategories() {
  const values = ["Все", ...new Set(state.events.map(x => x.category).sort((a, b) => a.localeCompare(b, "ru")))];
  els.categories.innerHTML = values.map(value => `<button class="chip${value === state.category ? " is-active" : ""}" data-category="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
  els.categories.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state.category = button.dataset.category;
    renderCategories(); render();
  }));
}

function render() {
  const allView = state.category === "Все" && !state.query;
  const featured = state.events.filter(item => item.featured).sort((a, b) => (a.featuredPriority || 999) - (b.featuredPriority || 999) || ruSort(a, b));
  els.featuredWrap.hidden = !allView || !featured.length;
  els.featured.innerHTML = allView ? featured.map((item, index) => cardHtml(item, index, true)).join("") : "";

  const filtered = state.events.filter(item => {
    if (allView && item.featured) return false;
    const categoryOk = state.category === "Все" || item.category === state.category;
    const haystack = `${item.title} ${item.command} ${(item.aliases || []).join(" ")} ${item.description}`.toLowerCase();
    return categoryOk && (!state.query || haystack.includes(state.query));
  }).sort(ruSort);

  els.events.innerHTML = filtered.length ? filtered.map((item, index) => cardHtml(item, index, false)).join("") : `<p class="empty">Ничего не найдено.</p>`;
  document.querySelectorAll("[data-event-id]").forEach(button => button.addEventListener("click", () => openEvent(button.dataset.eventId)));
}

function cardHtml(item, index, featured) {
  const dlc = item.requiresDlc ? `<span class="dlc-badge dlc-badge--${escapeHtml(item.requiresDlc)}">${escapeHtml(item.requiresDlc.toUpperCase())}</span>` : "";
  return `<article class="card${featured ? " card--featured" : ""}">
    ${featured ? '<span class="electric-orbit" aria-hidden="true"></span>' : ""}
    <div class="card__top"><span class="card__number">${String(index + 1).padStart(2, "0")}</span><div class="card__badges">${dlc}<span class="card__tag">${escapeHtml(item.target)}</span></div></div>
    <h2>${escapeHtml(item.title)}</h2>
    <p>${escapeHtml(item.description)}</p>
    <div class="card__meta"><div><span class="price">${money(item.priceRub)}</span><span class="command">${escapeHtml(item.command)}</span></div><button class="button button--ghost" data-event-id="${escapeHtml(item.id)}">Выбрать</button></div>
  </article>`;
}

function openEvent(id) {
  selected = state.events.find(item => item.id === id);
  if (!selected) return;
  const dlc = selected.requiresDlc ? ` · ${selected.requiresDlc.toUpperCase()}` : "";
  els.category.textContent = `${selected.category} · ${selected.target}${dlc}`;
  els.title.textContent = selected.title;
  els.description.textContent = selected.description;
  els.price.textContent = money(selected.priceRub);
  els.command.textContent = selected.command;
  els.note.textContent = cfg.minAmountNote || "";
  els.eventDialog.showModal();
}

function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

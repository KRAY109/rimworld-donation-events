const cfg = window.RIM_DONATIONS_CONFIG || {};
const state = { events: [], category: "Все", query: "" };
const els = {
  events: document.querySelector("#events"), categories: document.querySelector("#categories"), search: document.querySelector("#search"),
  eventDialog: document.querySelector("#event-dialog"), helpDialog: document.querySelector("#help-dialog"),
  title: document.querySelector("#modal-title"), category: document.querySelector("#modal-category"), description: document.querySelector("#modal-description"),
  price: document.querySelector("#modal-price"), command: document.querySelector("#modal-command"), note: document.querySelector("#modal-note"), copy: document.querySelector("#copy-command")
};
let selected = null;
const money = value => new Intl.NumberFormat("ru-RU").format(value) + " ₽";

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

fetch("events.json")
  .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then(data => { state.events = data.events; renderCategories(); render(); })
  .catch(error => { els.events.innerHTML = `<p class="empty">Не удалось загрузить прайс: ${error.message}</p>`; });

function renderCategories() {
  const values = ["Все", ...new Set(state.events.map(x => x.category))];
  els.categories.innerHTML = values.map(value => `<button class="chip${value === state.category ? " is-active" : ""}" data-category="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("");
  els.categories.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    state.category = button.dataset.category;
    renderCategories(); render();
  }));
}
function render() {
  const filtered = state.events.filter(item => {
    const categoryOk = state.category === "Все" || item.category === state.category;
    const haystack = `${item.title} ${item.command} ${item.description}`.toLowerCase();
    return categoryOk && (!state.query || haystack.includes(state.query));
  });
  if (!filtered.length) { els.events.innerHTML = `<p class="empty">Ничего не найдено.</p>`; return; }
  els.events.innerHTML = filtered.map((item, index) => `
    <article class="card">
      <div class="card__top"><span class="card__number">${String(index + 1).padStart(2, "0")}</span><span class="card__tag">${escapeHtml(item.target)}</span></div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.description)}</p>
      <div class="card__meta"><div><span class="price">${money(item.priceRub)}</span><span class="command">${escapeHtml(item.command)}</span></div><button class="button button--ghost" data-id="${item.id}">Выбрать</button></div>
    </article>`).join("");
  els.events.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => openEvent(button.dataset.id)));
}
function openEvent(id) {
  selected = state.events.find(item => item.id === id);
  if (!selected) return;
  els.category.textContent = `${selected.category} · ${selected.target}`;
  els.title.textContent = selected.title;
  els.description.textContent = selected.description;
  els.price.textContent = money(selected.priceRub);
  els.command.textContent = selected.command;
  els.note.textContent = cfg.minAmountNote || "";
  els.eventDialog.showModal();
}
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

/** Shared desktop layouts and local draft persistence for authenticated tools. */

const drafts = {
  "add-money.html": ["add-money-bank", "add-money-number", "add-money-amount"],
  "cashout.html": ["cashout-number", "cashout-amount"],
  "send-money.html": ["recipient-number", "send-amount", "send-message"],
  "pay-bill.html": ["bill-account", "bill-amount", "bill-due-date"],
};

function draftKey() {
  return `payoo:draft:${location.pathname.split("/").pop()}`;
}

function setupDrafts() {
  const ids = drafts[location.pathname.split("/").pop()];
  if (!ids) return;
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(draftKey()) || "{}");
  } catch {}
  ids.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    if (stored[id] !== undefined) input.value = stored[id];
    input.addEventListener("input", () => {
      const next = Object.fromEntries(
        ids.map((field) => [
          field,
          document.getElementById(field)?.value || "",
        ]),
      );
      localStorage.setItem(draftKey(), JSON.stringify(next));
    });
    input.addEventListener("change", () =>
      input.dispatchEvent(new Event("input")),
    );
  });
  document.addEventListener("payoo:clear-draft", () =>
    localStorage.removeItem(draftKey()),
  );
}

function addTransactionPreview(buttonId, fields, title) {
  const button = document.getElementById(buttonId);
  const section = button?.closest("section");
  const card = button?.closest(".card");
  if (!section || !card || section.querySelector(".payoo-form-preview")) return;
  const host = card.parentElement?.classList.contains("space-y-4")
    ? card.parentElement
    : section;
  host.classList.add("payoo-split-form");
  const preview = document.createElement("aside");
  preview.className = "payoo-form-preview card bg-base-100 shadow rounded-2xl";
  preview.innerHTML = `<div class="card-body"><p class="text-xs uppercase tracking-wider text-neutral/50">Review</p><h3 class="font-bold text-xl">${title}</h3><div class="divider my-1"></div><dl class="space-y-3" id="${buttonId}-preview"></dl><p class="text-xs text-neutral/50 mt-auto">Drafts are saved on this device until the transaction is complete.</p></div>`;
  card.after(preview);
  const render = () => {
    const list = preview.querySelector("dl");
    list.innerHTML = fields
      .map(
        ([label, id]) =>
          `<div class="flex justify-between gap-3"><dt class="text-neutral/60">${label}</dt><dd class="font-medium text-right break-all">${document.getElementById(id)?.value || "—"}</dd></div>`,
      )
      .join("");
  };
  fields.forEach(([, id]) =>
    document.getElementById(id)?.addEventListener("input", render),
  );
  render();
}

function addStyles() {
  if (document.getElementById("payoo-page-upgrade-styles")) return;
  const style = document.createElement("style");
  style.id = "payoo-page-upgrade-styles";
  style.textContent = `
    @media (min-width: 1200px) {
      .payoo-split-form { display:grid; grid-template-columns:minmax(0, 1.25fr) minmax(280px, .75fr); gap:1.25rem; align-items:start; }
      .payoo-split-form > h2 { grid-column:1 / -1; }
      .payoo-form-preview { position:sticky; top:6.5rem; min-height:20rem; }
      #payoo-page-container section:has(#pay-bill-btn) > div { display:grid; grid-template-columns:minmax(220px, .7fr) minmax(0, 1.3fr); gap:1.25rem; }
      #payoo-page-container section:has(#budget-results) > .space-y-4 { display:grid; grid-template-columns:minmax(340px, 1fr) minmax(340px, 1fr); gap:1rem; align-items:start; }
      #payoo-page-container section:has(#budget-results) #budget-results { grid-column:2; grid-row:1 / span 2; position:sticky; top:6.5rem; }
      #payoo-page-container section:has(#qr-reader) > .space-y-4 { display:grid; grid-template-columns:minmax(360px, 1fr) minmax(300px, .8fr); gap:1rem; align-items:start; }
      #payoo-page-container section:has(#qr-reader) > .space-y-4 > :first-child { grid-row:span 2; }
    }
    .savings-ring { width:3.25rem; height:3.25rem; border-radius:50%; display:grid; place-items:center; background:conic-gradient(oklch(var(--su)) calc(var(--progress) * 1%), oklch(var(--b3)) 0); }
    .savings-ring::after { content:""; width:2.55rem; height:2.55rem; background:oklch(var(--b1)); border-radius:50%; position:absolute; }
    .savings-ring > span { position:relative; z-index:1; font-size:.7rem; font-weight:700; }
    @media print { .payoo-sidebar, .payoo-topbar, .transactions-toolbar, #toast-container { display:none !important; } .payoo-shell { display:block !important; } .payoo-main > section { padding:0 !important; } }
  `;
  document.head.append(style);
}

export function initPageUpgrades() {
  addStyles();
  setupDrafts();
  addTransactionPreview(
    "add-money-btn",
    [
      ["Bank", "add-money-bank"],
      ["Account", "add-money-number"],
      ["Amount", "add-money-amount"],
    ],
    "Add money",
  );
  addTransactionPreview(
    "cashout-btn",
    [
      ["Agent", "cashout-number"],
      ["Amount", "cashout-amount"],
    ],
    "Cashout details",
  );
  // The Send Money page uses a modal review flow instead of the desktop sidebar preview.
}

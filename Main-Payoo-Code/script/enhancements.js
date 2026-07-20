/** Non-invasive quality, safety, and accessibility enhancements. */

const SESSION_WARNING_MS = 25 * 60 * 1000;
const SESSION_KEY = "payoo:session-last-active";

export const formatMoney = (value) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 2 }).format(Number(value || 0));

export function showUndo(message, undo) {
  const host = document.getElementById("toast-container") || document.body;
  const notice = document.createElement("div");
  notice.className = "alert shadow-lg bg-base-100 border border-base-300";
  notice.setAttribute("role", "status");
  notice.innerHTML = `<span>${message}</span><button class="btn btn-sm btn-primary">Undo</button>`;
  host.append(notice);
  const timer = setTimeout(() => notice.remove(), 7000);
  notice.querySelector("button").addEventListener("click", () => { clearTimeout(timer); undo(); notice.remove(); });
}

export function showConfirmation({ title, message, confirmLabel = "Confirm", onConfirm }) {
  const previousFocus = document.activeElement;
  const escape = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.setAttribute("aria-labelledby", "payoo-confirmation-title");
  dialog.innerHTML = `<div class="modal-box max-w-md"><div class="flex items-start gap-3"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-error/10 text-error"><i class="fa-solid fa-trash-can"></i></span><div><h3 id="payoo-confirmation-title" class="font-bold text-lg">${escape(title)}</h3><p class="mt-1 text-sm text-neutral/65">${escape(message)}</p></div></div><div class="mt-5 rounded-xl bg-base-200 p-3 text-sm"><i class="fa-solid fa-circle-info text-primary mr-1"></i> You can restore it for a few seconds after deleting.</div><div class="modal-action"><button type="button" class="btn btn-ghost" data-cancel>Keep goal</button><button type="button" class="btn btn-error" data-confirm><i class="fa-solid fa-trash-can"></i> ${escape(confirmLabel)}</button></div></div>`;
  const close = () => { dialog.close(); dialog.remove(); previousFocus?.focus?.(); };
  dialog.addEventListener("close", () => { if (dialog.isConnected) dialog.remove(); previousFocus?.focus?.(); }, { once: true });
  dialog.querySelector("[data-cancel]").addEventListener("click", close);
  dialog.querySelector("[data-confirm]").addEventListener("click", () => { onConfirm(); close(); });
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector("[data-cancel]").focus();
}

export function printReceipt(transaction) {
  const popup = window.open("", "_blank", "width=620,height=720");
  if (!popup) return;
  const amount = formatMoney(transaction.amount);
  popup.document.write(`<!doctype html><title>Payoo receipt</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#1f2937}.receipt{max-width:500px;margin:auto;border:1px solid #ddd;border-radius:16px;padding:28px}h1{color:#7460ff}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee}.amount{font-size:26px;font-weight:bold}</style><main class="receipt"><h1>Payoo</h1><h2>Transaction receipt</h2><div class="row"><span>Reference</span><strong>${transaction.id || "—"}</strong></div><div class="row"><span>Date</span><strong>${new Date(transaction.date).toLocaleString()}</strong></div><div class="row"><span>Details</span><strong>${transaction.description || transaction.type}</strong></div><div class="row"><span>Type</span><strong>${transaction.type || "Transaction"}</strong></div><p class="amount">${amount}</p><p>Thank you for using Payoo.</p></main><script>window.onload=()=>window.print()<\/script>`);
  popup.document.close();
}

function setupSessionWarning() {
  if (!sessionStorage.getItem("payoo_token") || document.documentElement.dataset.sessionWatch) return;
  document.documentElement.dataset.sessionWatch = "true";
  const touch = () => localStorage.setItem(SESSION_KEY, String(Date.now()));
  touch();
  ["click", "keydown", "pointerdown"].forEach((event) => document.addEventListener(event, touch, { passive: true }));
  setInterval(() => {
    if (Date.now() - Number(localStorage.getItem(SESSION_KEY) || 0) < SESSION_WARNING_MS) return;
    if (document.getElementById("payoo-session-warning")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "payoo-session-warning";
    dialog.className = "modal";
    dialog.innerHTML = `<div class="modal-box"><h3 class="font-bold text-lg">You’ll be signed out soon</h3><p class="py-3">For your security, this session has been inactive. Continue to keep working.</p><div class="modal-action"><button class="btn btn-primary">Continue session</button></div></div>`;
    document.body.append(dialog); dialog.showModal();
    dialog.querySelector("button").focus();
    dialog.querySelector("button").addEventListener("click", () => { touch(); dialog.close(); dialog.remove(); });
  }, 60000);
}

function setupDialogAccessibility() {
  document.addEventListener("keydown", (event) => {
    const dialog = document.querySelector("dialog[open]");
    if (!dialog || event.key !== "Tab") return;
    const items = [...dialog.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((node) => !node.disabled);
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}

function setupAmountPreviews() {
  document.querySelectorAll("input[inputmode='decimal']").forEach((input) => {
    if (input.dataset.amountPreview) return;
    input.dataset.amountPreview = "true";
    const preview = document.createElement("p");
    preview.className = "mt-1 text-xs text-neutral/60";
    preview.setAttribute("aria-live", "polite");
    const update = () => { const value = Number(input.value); preview.textContent = value > 0 ? `Amount: ${formatMoney(value)} · Estimated fee: ${formatMoney(0)}` : ""; };
    input.insertAdjacentElement("afterend", preview); input.addEventListener("input", update); update();
  });
}

function setupBalanceVisibility() {
  document.querySelectorAll("#balance").forEach((balance) => {
    if (document.getElementById("payoo-balance-visibility")) return;
    const button = document.createElement("button");
    button.id = "payoo-balance-visibility"; button.className = "btn btn-ghost btn-xs"; button.type = "button"; button.setAttribute("aria-label", "Hide balance");
    const saved = balance.textContent;
    button.innerHTML = '<i class="fa-regular fa-eye-slash"></i>';
    balance.insertAdjacentElement("afterend", button);
    button.addEventListener("click", () => { const hidden = button.dataset.hidden !== "true"; button.dataset.hidden = String(hidden); balance.style.visibility = hidden ? "hidden" : "visible"; button.setAttribute("aria-label", hidden ? "Show balance" : "Hide balance"); button.innerHTML = hidden ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>'; });
  });
}

export function initEnhancements() {
  document.querySelectorAll("#toast-container").forEach((node) => node.setAttribute("aria-live", "polite"));
  setupSessionWarning(); setupDialogAccessibility(); setupAmountPreviews(); setupBalanceVisibility();
}

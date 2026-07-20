import { updateBalanceDisplay } from "../dom.js";
import { SessionManager, TRANSACTION_TYPES } from "../bankservice.js";
import { printReceipt } from "../enhancements.js";

class TransactionsController {
  constructor() {
    const session = SessionManager.getSession();
    if (!session?.user) return (window.location.href = "index.html");
    this.user = session.user;
    this.preferencesKey = "payoo:transaction-preferences";
    const preferences = JSON.parse(localStorage.getItem(this.preferencesKey) || "{}");
    this.sort = preferences.sort || { key: "date", direction: "desc" };
    this.page = 1; this.pageSize = 8;
    this.query = preferences.query || ""; this.type = preferences.type || "all";
    this.init();
  }
  init() { updateBalanceDisplay(this.user.balance); this.renderWorkspace(); }
  get transactions() { return Array.isArray(this.user.transactions) ? this.user.transactions : []; }
  savePreferences() { localStorage.setItem(this.preferencesKey, JSON.stringify({ query: this.query, type: this.type, sort: this.sort })); }
  filteredTransactions() {
    const query = this.query.toLowerCase();
    return this.transactions.filter((tx) => this.type === "all" || tx.type === this.type).filter((tx) => !query || `${tx.description} ${tx.type} ${tx.amount}`.toLowerCase().includes(query)).sort((a, b) => {
      const left = this.sort.key === "amount" ? Number(a.amount) : new Date(a.date).getTime(); const right = this.sort.key === "amount" ? Number(b.amount) : new Date(b.date).getTime();
      return (left - right) * (this.sort.direction === "asc" ? 1 : -1);
    });
  }
  renderWorkspace() {
    const container = document.getElementById("transactions-container"); if (!container) return;
    container.className = "space-y-4";
    container.innerHTML = `<div class="transactions-toolbar bg-base-100 rounded-2xl p-3 shadow-sm flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><label class="input input-bordered flex items-center gap-2 flex-1"><i class="fa-solid fa-magnifying-glass opacity-50"></i><input id="transaction-search" type="search" class="grow" placeholder="Search transactions" value="${this.escape(this.query)}" /></label><div class="flex gap-2"><select id="transaction-type" class="select select-bordered select-sm"><option value="all">All types</option><option value="deposit">Add money</option><option value="withdrawal">Cashout</option><option value="transfer">Send money</option><option value="payment">Bill payment</option><option value="bonus">Bonus</option></select><button id="export-transactions" class="btn btn-outline btn-sm"><i class="fa-solid fa-file-csv"></i> Export CSV</button><button id="print-transactions" class="btn btn-ghost btn-sm" title="Print transactions"><i class="fa-solid fa-print"></i></button></div></div><div id="transaction-results"></div>`;
    container.querySelector("#transaction-type").value = this.type;
    let searchTimer;
    container.querySelector("#transaction-search").addEventListener("input", (event) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { this.query = event.target.value; this.page = 1; this.savePreferences(); this.renderResults(); }, 180); });
    container.querySelector("#transaction-type").addEventListener("change", (event) => { this.type = event.target.value; this.page = 1; this.savePreferences(); this.renderResults(); });
    container.querySelector("#export-transactions").addEventListener("click", () => this.exportCsv()); container.querySelector("#print-transactions").addEventListener("click", () => window.print()); this.renderResults();
  }
  renderResults() {
    const results = document.getElementById("transaction-results"); const filtered = this.filteredTransactions(); const pages = Math.max(1, Math.ceil(filtered.length / this.pageSize)); this.page = Math.min(this.page, pages); const rows = filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
    if (!filtered.length) { results.innerHTML = `<div class="text-center py-12 bg-base-100 rounded-2xl"><i class="fa-solid fa-receipt text-4xl opacity-30 mb-3"></i><p class="font-medium">No matching transactions</p><p class="text-sm text-neutral/60 mt-1">Try a different search or make your first payment from the dashboard.</p><a class="btn btn-primary btn-sm mt-4" href="home.html">Go to dashboard</a></div>`; return; }
    results.innerHTML = `<div class="hidden lg:block overflow-x-auto bg-base-100 rounded-2xl shadow-sm"><table class="table table-zebra"><thead><tr><th><button class="sort-btn" data-sort="date">Date ${this.sortIcon("date")}</button></th><th>Description</th><th>Type</th><th class="text-right"><button class="sort-btn" data-sort="amount">Amount ${this.sortIcon("amount")}</button></th><th><span class="sr-only">Receipt</span></th></tr></thead><tbody>${rows.map((tx) => this.tableRow(tx)).join("")}</tbody></table></div><div class="lg:hidden space-y-2">${rows.map((tx) => this.cardRow(tx)).join("")}</div><div class="flex justify-between items-center mt-4"><span class="text-sm text-neutral/60">${filtered.length} transaction${filtered.length === 1 ? "" : "s"}</span><div class="join"><button id="previous-page" class="join-item btn btn-sm" ${this.page === 1 ? "disabled" : ""}>Previous</button><span class="join-item btn btn-sm btn-ghost pointer-events-none">${this.page} / ${pages}</span><button id="next-page" class="join-item btn btn-sm" ${this.page === pages ? "disabled" : ""}>Next</button></div></div>`;
    results.querySelectorAll(".sort-btn").forEach((button) => button.addEventListener("click", () => this.changeSort(button.dataset.sort)));
    results.querySelectorAll(".receipt-btn").forEach((button) => button.addEventListener("click", () => printReceipt(this.transactions.find((tx) => tx.id === button.dataset.id))));
    results.querySelector("#previous-page")?.addEventListener("click", () => { this.page--; this.renderResults(); }); results.querySelector("#next-page")?.addEventListener("click", () => { this.page++; this.renderResults(); });
  }
  metadata(tx) { const incoming = [TRANSACTION_TYPES.DEPOSIT, TRANSACTION_TYPES.BONUS].includes(tx.type); const labels = { deposit: "Add money", withdrawal: "Cashout", transfer: "Send money", payment: "Bill payment", bonus: "Bonus" }; return { incoming, label: labels[tx.type] || tx.type, date: new Date(tx.date).toLocaleString() }; }
  tableRow(tx) { const meta = this.metadata(tx); return `<tr><td class="whitespace-nowrap">${meta.date}</td><td>${this.escape(tx.description)}</td><td><span class="badge badge-ghost">${meta.label}</span></td><td class="text-right font-semibold ${meta.incoming ? "text-success" : "text-error"}">${meta.incoming ? "+" : "-"}$${Number(tx.amount).toFixed(2)}</td><td><button class="receipt-btn btn btn-ghost btn-xs" data-id="${tx.id}" aria-label="Print receipt"><i class="fa-solid fa-receipt"></i></button></td></tr>`; }
  cardRow(tx) { const meta = this.metadata(tx); return `<article class="bg-base-100 rounded-xl p-4 flex justify-between gap-3 shadow-sm"><div><p class="font-medium text-sm">${this.escape(tx.description)}</p><p class="text-xs text-neutral/50 mt-1">${meta.date} · ${meta.label}</p></div><div class="text-right"><p class="font-bold ${meta.incoming ? "text-success" : "text-error"}">${meta.incoming ? "+" : "-"}$${Number(tx.amount).toFixed(2)}</p><button class="receipt-btn btn btn-ghost btn-xs mt-1" data-id="${tx.id}">Receipt</button></div></article>`; }
  changeSort(key) { this.sort.direction = this.sort.key === key && this.sort.direction === "desc" ? "asc" : "desc"; this.sort.key = key; this.savePreferences(); this.renderResults(); }
  sortIcon(key) { return this.sort.key === key ? (this.sort.direction === "asc" ? "↑" : "↓") : "↕"; }
  exportCsv() { const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`; const csv = [["Date", "Description", "Type", "Amount"], ...this.filteredTransactions().map((tx) => [tx.date, tx.description, tx.type, tx.amount])].map((row) => row.map(quote).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = Object.assign(document.createElement("a"), { href: url, download: "payoo-transactions.csv" }); link.click(); URL.revokeObjectURL(url); }
  escape(value) { const el = document.createElement("div"); el.textContent = value; return el.innerHTML; }
}
document.addEventListener("DOMContentLoaded", () => new TransactionsController());

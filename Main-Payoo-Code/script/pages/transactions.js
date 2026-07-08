/**
 * Transactions Page Controller
 */

import { updateBalanceDisplay } from "../dom.js";
import { SessionManager, TRANSACTION_TYPES } from "../bankservice.js";

class TransactionsController {
  constructor() {
    const session = SessionManager.getSession();
    if (!session?.user) {
      window.location.href = "../index.html";
      return;
    }

    this.session = session;
    this.user = this.session.user;

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    this.renderTransactions();
  }

  renderTransactions() {
    const container = document.getElementById("transactions-container");
    if (!container) return;

    const transactions = this.user.transactions || [];

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <div class="text-6xl mb-4">📭</div>
          <p class="text-neutral/50 text-lg">No transactions yet</p>
          <p class="text-xs text-neutral/30 mt-2">Start using Payoo to see your history</p>
          <a href="home.html" class="btn btn-ghost mt-6">
            <i class="fa-solid fa-arrow-left"></i>
            Back to Dashboard
          </a>
        </div>
      `;
      return;
    }

    // Sort by date (newest first)
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    container.innerHTML = sorted
      .map((tx) => {
        const isDeposit =
          tx.type === TRANSACTION_TYPES.DEPOSIT ||
          tx.type === TRANSACTION_TYPES.BONUS;
        const isWithdrawal =
          tx.type === TRANSACTION_TYPES.WITHDRAWAL ||
          tx.type === TRANSACTION_TYPES.TRANSFER ||
          tx.type === TRANSACTION_TYPES.PAYMENT;

        let sign = "";
        let colorClass = "text-neutral";
        let bgColor = "bg-neutral/5";
        let icon = "💰";

        if (isDeposit) {
          sign = "+";
          colorClass = "text-success";
          bgColor = "bg-success/5";
          icon = tx.type === TRANSACTION_TYPES.BONUS ? "🎁" : "📈";
        } else if (isWithdrawal) {
          sign = "-";
          colorClass = "text-error";
          bgColor = "bg-error/5";
          icon = tx.type === TRANSACTION_TYPES.PAYMENT ? "📄" : "📉";
        }

        const date = new Date(tx.date);
        const formattedDate = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
          <div class="transaction-item flex justify-between items-center p-4 ${bgColor} rounded-xl hover:shadow-md transition-all duration-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center text-xl shadow-sm">
                ${icon}
              </div>
              <div>
                <p class="font-medium text-sm">${this.escapeHtml(tx.description)}</p>
                <p class="text-xs text-neutral/40">${formattedDate} • ${formattedTime}</p>
              </div>
            </div>
            <div class="${colorClass} font-bold text-sm">
              ${sign}$${tx.amount.toFixed(2)}
            </div>
          </div>
        `;
      })
      .join("");
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new TransactionsController();
});

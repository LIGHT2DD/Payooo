/**
 * Dashboard Controller
 * Senior Dev Note: Enhanced dashboard with language toggle, dark mode, quick actions, and stats.
 */

import { updateBalanceDisplay, displayError, displaySuccess } from "./dom.js";
import {
  BankService,
  SessionManager,
  TRANSACTION_TYPES,
} from "./bankservice.js";
import { buildDashboardData, renderDashboardCharts } from "./charts.js";

class DashboardController {
  constructor() {
    // Check authentication
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "index.html";
      return;
    }

    // Get session data
    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.userId = this.user.id;
    this.userPin = this.user?.pin;
    this.isProcessing = false;

    // Language state
    this.currentLang = localStorage.getItem("payoo_lang") || "en";

    // Theme state
    this.currentTheme = localStorage.getItem("payoo_theme") || "light";

    this.normalizeUserData();

    // Initialize
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    this.applyLanguage(this.currentLang);
    this.refreshDashboard();

    this.setupLogout();
    this.setupQuickActions();
    this.setupRefreshBalance();
    this.setupLanguageToggle();
    this.setupThemeToggle();
    this.setupDashboardPersonalization();

    // Listen for storage changes to update balance when transactions happen
    window.addEventListener("storage", (e) => {
      if (e.key === "payoo_user" || e.key === "payoo_token") {
        this.refreshDashboard();
      }
    });

    // Also listen for custom event from same page
    window.addEventListener("payoo:transaction", () => {
      this.refreshDashboard();
    });

    // Auto-refresh balance every 30 seconds
    setInterval(() => {
      this.updateBalance();
      this.updateStats();
    }, 30000);
  }

  setupDashboardPersonalization() {
    const widgets = document.getElementById("dashboard-widgets");
    if (!widgets || document.getElementById("customize-dashboard")) return;
    const key = "payoo:dashboard-hidden-widgets";
    const cards = [...widgets.children];
    cards.forEach((card, index) => {
      card.dataset.widgetId = card.dataset.widgetId || `widget-${index + 1}`;
    });
    const hidden = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    cards.forEach((card) => card.classList.toggle("hidden", hidden.has(card.dataset.widgetId)));
    const button = document.createElement("button");
    button.id = "customize-dashboard";
    button.type = "button";
    button.className = "btn btn-ghost btn-sm";
    button.innerHTML = '<i class="fa-solid fa-sliders"></i> Customize';
    widgets.insertAdjacentElement("beforebegin", button);
    button.addEventListener("click", () => {
      const dialog = document.createElement("dialog");
      dialog.className = "modal";
      dialog.innerHTML = `<div class="modal-box"><h3 class="font-bold text-lg">Dashboard widgets</h3><p class="text-sm text-neutral/60 py-2">Choose which summary widgets to show.</p><div class="space-y-2">${cards.map((card, index) => `<label class="flex items-center gap-3"><input class="checkbox checkbox-primary" type="checkbox" value="${card.dataset.widgetId}" ${!hidden.has(card.dataset.widgetId) ? "checked" : ""}> Widget ${index + 1}</label>`).join("")}</div><div class="modal-action"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" data-save>Save</button></div></div>`;
      document.body.append(dialog); dialog.showModal();
      dialog.querySelector("[data-close]").addEventListener("click", () => dialog.remove());
      dialog.querySelector("[data-save]").addEventListener("click", () => {
        const nextHidden = cards.filter((card) => !dialog.querySelector(`input[value="${card.dataset.widgetId}"]`).checked).map((card) => card.dataset.widgetId);
        localStorage.setItem(key, JSON.stringify(nextHidden));
        cards.forEach((card) => card.classList.toggle("hidden", nextHidden.includes(card.dataset.widgetId)));
        dialog.remove();
      });
    });
  }

  // ==================== THEME MANAGEMENT ====================

  setupThemeToggle() {
    const themeToggle = document.getElementById("theme-toggle");
    if (!themeToggle) return;

    // Update icon based on current theme
    this.updateThemeIcon();

    themeToggle.addEventListener("click", () => {
      const newTheme = this.currentTheme === "light" ? "dark" : "light";
      this.applyTheme(newTheme);
    });
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("payoo_theme", theme);
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const themeToggle = document.getElementById("theme-toggle");
    if (!themeToggle) return;

    const icon = themeToggle.querySelector("i");
    if (this.currentTheme === "dark") {
      icon.className = "fa-solid fa-moon text-lg";
      themeToggle.title = "Dark Mode";
    } else {
      icon.className = "fa-regular fa-lightbulb text-lg";
      themeToggle.title = "Light Mode";
    }
  }

  // ==================== LANGUAGE MANAGEMENT ====================

  setupLanguageToggle() {
    const langEn = document.getElementById("lang-en");
    const langBn = document.getElementById("lang-bn");

    if (langEn && langBn) {
      // Set initial active state
      if (this.currentLang === "en") {
        langEn.classList.add("active");
        langBn.classList.remove("active");
      } else {
        langBn.classList.add("active");
        langEn.classList.remove("active");
      }

      langEn.addEventListener("click", () => {
        this.applyLanguage("en");
      });

      langBn.addEventListener("click", () => {
        this.applyLanguage("bn");
      });
    }
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    localStorage.setItem("payoo_lang", lang);

    // Update toggle buttons
    const langEn = document.getElementById("lang-en");
    const langBn = document.getElementById("lang-bn");

    if (langEn && langBn) {
      if (lang === "en") {
        langEn.classList.add("active");
        langBn.classList.remove("active");
      } else {
        langBn.classList.add("active");
        langEn.classList.remove("active");
      }
    }

    // Update body class for font
    if (lang === "bn") {
      document.body.classList.add("lang-bn");
    } else {
      document.body.classList.remove("lang-bn");
    }

    // Apply translations
    this.translatePage(lang);
  }

  translatePage(lang) {
    const translations = {
      en: {
        "balance-label": "Available Balance",
        "logout-text": "Logout",
        "welcome-text": 'Welcome to Pay<span class="text-primary">oo</span>',
        "welcome-subtitle": "Enjoy easy and convenient financial services",
        "total-transactions-label": "Total Transactions",
        "last-transaction-label": "Last Transaction",
        "last-transaction":
          this.user.transactions && this.user.transactions.length > 0
            ? "..."
            : "No transactions",
        "services-title": "Services",
        "add-money-text": "Add Money",
        "cashout-text": "Cashout",
        "send-money-text": "Send Money",
        "get-bonus-text": "Get Bonus",
        "pay-bill-text": "Pay Bill",
        "history-text": "History",
        "features-title": "Tools & Features",
        "savings-text": "Savings",
        "donate-text": "Donate",
        "budget-text": "Budget Calc",
        "currency-converter-text": "Currency Conv",
        "currency-db-text": "Currency DB",
        "qr-text": "QR Scanner",
        "quick-actions-title": "Quick Actions",
        "quick-send-text": "Send Money",
        "quick-send-subtitle": "Open the send money page",
        "quick-pay-bill-text": "Pay Bill",
        "quick-pay-bill-subtitle": "Open the bill payment page",
        "recent-activity-title": "Recent Activity",
        "view-all-text": "View All",
        "no-transactions-text": "No recent transactions",
        "new-badge": "NEW",
      },
      bn: {
        "balance-label": "উপলব্ধ ব্যালেন্স",
        "logout-text": "লগআউট",
        "welcome-text": 'পে<span class="text-primary">oo</span> তে স্বাগতম',
        "welcome-subtitle": "সহজ এবং সুবিধাজনক আর্থিক সেবা উপভোগ করুন",
        "total-transactions-label": "মোট লেনদেন",
        "last-transaction-label": "শেষ লেনদেন",
        "last-transaction":
          this.user.transactions && this.user.transactions.length > 0
            ? "..."
            : "কোন লেনদেন নেই",
        "services-title": "সেবাসমূহ",
        "add-money-text": "টাকা যোগ করুন",
        "cashout-text": "ক্যাশআউট",
        "send-money-text": "টাকা পাঠান",
        "get-bonus-text": "বোনাস নিন",
        "pay-bill-text": "বিল পরিশোধ",
        "history-text": "ইতিহাস",
        "features-title": "টুলস এবং ফিচার",
        "savings-text": "সঞ্চয়",
        "donate-text": "দান করুন",
        "budget-text": "বাজেট ক্যালক",
        "currency-converter-text": "মুদ্রা রূপান্তর",
        "currency-db-text": "মুদ্রা ডাটাবেস",
        "qr-text": "কিউআর স্ক্যানার",
        "quick-actions-title": "দ্রুত অ্যাকশন",
        "quick-send-text": "টাকা পাঠান",
        "quick-send-subtitle": "সেন্ড মানি পেজ খুলুন",
        "quick-pay-bill-text": "বিল পরিশোধ",
        "quick-pay-bill-subtitle": "বিল পেমেন্ট পেজ খুলুন",
        "recent-activity-title": "সাম্প্রতিক কার্যকলাপ",
        "view-all-text": "সব দেখুন",
        "no-transactions-text": "কোন সাম্প্রতিক লেনদেন নেই",
        "new-badge": "নতুন",
      },
    };

    const texts = translations[lang];

    // Update all translatable elements
    Object.keys(texts).forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        if (id === "welcome-text") {
          element.innerHTML = texts[id];
        } else {
          element.textContent = texts[id];
        }
      }
    });

    // Update last transaction if exists
    if (this.user.transactions && this.user.transactions.length > 0) {
      const last = this.user.transactions[0];
      const date = new Date(last.date);
      const formatted = date.toLocaleDateString(
        lang === "bn" ? "bn-BD" : "en-US",
        {
          month: "short",
          day: "numeric",
        },
      );
      const lastTransEl = document.getElementById("last-transaction");
      if (lastTransEl) {
        lastTransEl.textContent = `${formatted} - $${last.amount.toFixed(2)}`;
      }
    }

    this.updateBonusCardState();
  }

  // ==================== BALANCE & STATS ====================

  normalizeUserData() {
    const session = SessionManager.getSession();
    if (session && session.user) {
      this.user = session.user;
    }

    if (!this.user) return;

    this.user.balance = Number(this.user.balance || 0);
    this.user.transactions = Array.isArray(this.user.transactions)
      ? this.user.transactions
      : [];
  }

  refreshDashboard() {
    this.normalizeUserData();
    this.updateBalance();
    this.updateStats();
    this.updateBalanceTrend();
    this.updateMoneyInTrend();
    this.updateMonthIncoming();
    this.renderRecentTransactions();
    this.updateBonusCardState();
    this.renderCharts();
  }

  updateBalance() {
    this.normalizeUserData();
    if (this.user) {
      updateBalanceDisplay(this.user.balance);
      const dashboardBalance = document.getElementById("dashboard-balance");
      if (dashboardBalance) {
        dashboardBalance.textContent = Number(
          this.user.balance,
        ).toLocaleString();
      }
    }
  }

  updateMonthIncoming() {
    this.normalizeUserData();
    if (!this.user) return;

    const monthIncomingEl = document.getElementById("month-incoming");
    if (!monthIncomingEl) return;

    // Calculate money in for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const incoming = (this.user.transactions || [])
      .filter((tx) => {
        const txDate = new Date(tx.date);
        return (
          ["deposit", "bonus"].includes(tx.type) &&
          txDate >= startOfMonth
        );
      })
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

    monthIncomingEl.textContent = `$${incoming.toFixed(2)}`;
  }

  updateBalanceTrend() {
    this.normalizeUserData();
    if (!this.user) return;

    const trendBalanceEl = document.getElementById("trend-balance");
    if (!trendBalanceEl) return;

    // Calculate trend based on last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = (this.user.transactions || [])
      .filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= sevenDaysAgo;
      });

    const netChange = recentTransactions.reduce((sum, tx) => {
      const amount = Number(tx.amount || 0);
      return ["deposit", "bonus"].includes(tx.type)
        ? sum + amount
        : sum - amount;
    }, 0);

    const currentBalance = Number(this.user.balance || 0);
    const previousBalance = currentBalance - netChange;

    if (previousBalance > 0) {
      const percentChange = ((netChange / previousBalance) * 100).toFixed(1);
      const isPositive = netChange >= 0;
      trendBalanceEl.className = isPositive ? "trend-up" : "trend-down";
      trendBalanceEl.innerHTML = `<i class="fa-solid fa-arrow-${isPositive ? "up" : "down"}"></i> ${Math.abs(percentChange)}%`;
    } else {
      trendBalanceEl.className = "trend-up";
      trendBalanceEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> 0%`;
    }
  }

  updateMoneyInTrend() {
    this.normalizeUserData();
    if (!this.user) return;

    const trendMoneyInEl = document.getElementById("trend-moneyin");
    if (!trendMoneyInEl) return;

    // Calculate money in trend based on last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentIncoming = (this.user.transactions || [])
      .filter((tx) => {
        const txDate = new Date(tx.date);
        return (
          ["deposit", "bonus"].includes(tx.type) &&
          txDate >= sevenDaysAgo
        );
      });

    const totalIncoming = recentIncoming.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0,
    );

    // Calculate previous period (7-14 days ago)
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const previousIncoming = (this.user.transactions || [])
      .filter((tx) => {
        const txDate = new Date(tx.date);
        return (
          ["deposit", "bonus"].includes(tx.type) &&
          txDate >= fourteenDaysAgo &&
          txDate < sevenDaysAgo
        );
      });

    const prevTotal = previousIncoming.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0,
    );

    if (prevTotal > 0) {
      const percentChange = ((totalIncoming - prevTotal) / prevTotal) * 100;
      const isPositive = percentChange >= 0;
      trendMoneyInEl.className = isPositive ? "trend-up" : "trend-down";
      trendMoneyInEl.innerHTML = `<i class="fa-solid fa-arrow-${isPositive ? "up" : "down"}"></i> ${Math.abs(percentChange).toFixed(1)}%`;
    } else if (totalIncoming > 0) {
      trendMoneyInEl.className = "trend-up";
      trendMoneyInEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> 100%`;
    } else {
      trendMoneyInEl.className = "trend-up";
      trendMoneyInEl.innerHTML = `<i class="fa-solid fa-arrow-up"></i> 0%`;
    }
  }

  updateStats() {
    this.normalizeUserData();
    if (!this.user) return;

    const totalTransactions = document.getElementById("total-transactions");
    if (totalTransactions) {
      const count = this.user.transactions ? this.user.transactions.length : 0;
      totalTransactions.textContent = count;
    }

    const lastTransaction = document.getElementById("last-transaction");
    const trendLastEl = document.getElementById("trend-last");
    if (lastTransaction) {
      if (this.user.transactions && this.user.transactions.length > 0) {
        const last = this.user.transactions[0];
        const date = new Date(last.date);
        const formatted = date.toLocaleDateString(
          this.currentLang === "bn" ? "bn-BD" : "en-US",
          {
            month: "short",
            day: "numeric",
          },
        );
        lastTransaction.textContent = `${formatted} - $${Number(last.amount || 0).toFixed(2)}`;

        if (trendLastEl) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastDay = new Date(date);
          lastDay.setHours(0, 0, 0, 0);
          const diffDays = Math.round((today - lastDay) / 86400000);
          const label =
            diffDays === 0
              ? "Today"
              : diffDays === 1
                ? "1 day"
                : `${diffDays} days`;
          const up = diffDays <= 1;
          trendLastEl.className = up ? "trend-up" : "trend-down";
          const icon = up ? "fa-arrow-up" : "fa-arrow-down";
          trendLastEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
        }
      } else {
        lastTransaction.textContent =
          this.currentLang === "bn" ? "কোন লেনদেন নেই" : "No transactions";
        if (trendLastEl) {
          trendLastEl.className = "trend-down";
          trendLastEl.innerHTML = `<i class="fa-solid fa-arrow-down"></i> No activity`;
        }
      }
    }
  }

  // ==================== QUICK ACTIONS ====================

  setupQuickActions() {
    const quickSendBtn = document.getElementById("quick-send-money");
    if (quickSendBtn) {
      quickSendBtn.addEventListener("click", () => {
        window.location.href = "send-money.html";
      });
    }

    const quickPayBillBtn = document.getElementById("quick-pay-bill");
    if (quickPayBillBtn) {
      quickPayBillBtn.addEventListener("click", () => {
        window.location.href = "pay-bill.html";
      });
    }
  }

  setupRefreshBalance() {
    const refreshBtn = document.getElementById("refresh-balance");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        const icon = refreshBtn.querySelector("i");
        if (icon) icon.classList.add("fa-spin");

        await new Promise((resolve) => setTimeout(resolve, 500));

        this.refreshDashboard();

        if (icon) icon.classList.remove("fa-spin");
        const msg =
          this.currentLang === "bn"
            ? "ব্যালেন্স রিফ্রেশ হয়েছে!"
            : "Balance refreshed!";
        displaySuccess(msg);
      });
    }
  }

  setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        SessionManager.clearSession();
        window.location.href = "index.html";
      });
    }
  }

  renderCharts() {
    const balanceCanvas = document.getElementById("balance-trend-chart");
    const spendingCanvas = document.getElementById("spending-chart");
    if (balanceCanvas && spendingCanvas) {
      import("./charts.js").then(({ renderDashboardCharts }) => {
        renderDashboardCharts({
          balanceCanvas,
          spendingCanvas,
          transactions: this.user.transactions || [],
          balance: this.user.balance || 0,
        });
      });
    }
  }

  renderRecentTransactions() {
    const container = document.getElementById("recent-transactions");
    if (!container) return;

    if (!this.user.transactions || this.user.transactions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-500 text-sm">
          <i class="fa-solid fa-inbox text-3xl mb-3 block text-slate-300"></i>
          <span id="no-transactions-text">No recent transactions</span>
          <p class="text-xs text-slate-400 mt-1">
            Start using Payoo to see your activity
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.user.transactions
      .slice(0, 5)
      .map((tx) => {
        const date = new Date(tx.date);
        const formatted = date.toLocaleDateString(
          this.currentLang === "bn" ? "bn-BD" : "en-US",
          {
            month: "short",
            day: "numeric",
          },
        );
        const isIncoming = ["deposit", "bonus"].includes(tx.type);
        return `
          <div class="flex items-center justify-between p-3 bg-base-100 rounded-xl shadow-sm">
            <div>
              <p class="font-medium text-sm">${tx.type || "Transaction"}</p>
              <p class="text-xs text-muted">${formatted}</p>
            </div>
            <span class="${isIncoming ? "text-success" : "text-error"} font-bold">
              ${isIncoming ? "+" : "-"}$${Number(tx.amount || 0).toFixed(2)}
            </span>
          </div>
        `;
      })
      .join("");
  }

  updateBonusCardState() {
    const bonusLink = document.getElementById("home-bonus-link");
    if (bonusLink) {
      const statusBadge = document.getElementById("get-bonus-status");
      if (statusBadge) {
        const lastClaim = localStorage.getItem("payoo_last_bonus_claim");
        const today = new Date().toDateString();
        if (lastClaim === today) {
          statusBadge.textContent = "Claimed";
          statusBadge.classList.remove("badge-primary-soft");
          statusBadge.classList.add("badge-success");
        } else {
          statusBadge.textContent = "Available";
          statusBadge.classList.remove("badge-success");
          statusBadge.classList.add("badge-primary-soft");
        }
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new DashboardController();
});

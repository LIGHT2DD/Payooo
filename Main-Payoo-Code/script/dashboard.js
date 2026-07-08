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
    this.userPin = "1234";
    this.isProcessing = false;

    // Language state
    this.currentLang = localStorage.getItem("payoo_lang") || "en";

    // Theme state
    this.currentTheme = localStorage.getItem("payoo_theme") || "light";

    this.normalizeUserData();

    // Set initial balance to 5000 if not already set
    if (!this.user.balance || this.user.balance === 0) {
      this.user.balance = 5000;
      this.user.transactions = [];
      SessionManager.setSession(
        sessionStorage.getItem("payoo_token"),
        this.user,
      );
    }

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

    // Auto-refresh balance every 30 seconds
    setInterval(() => {
      this.updateBalance();
      this.updateStats();
    }, 30000);
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
      icon.className = "fa-solid fa-sun text-lg";
      themeToggle.title = "Switch to Light Mode";
    } else {
      icon.className = "fa-solid fa-moon text-lg";
      themeToggle.title = "Switch to Dark Mode";
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
        "quick-add-text": "Quick Add $100",
        "quick-add-subtitle": "Instant deposit from default bank",
        "quick-cashout-text": "Quick Cashout $50",
        "quick-cashout-subtitle": "Instant withdrawal to default agent",
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
        "quick-add-text": "দ্রুত $১০০ যোগ করুন",
        "quick-add-subtitle": "ডিফল্ট ব্যাংক থেকে তাৎক্ষণিক জমা",
        "quick-cashout-text": "দ্রুত $৫০ ক্যাশআউট",
        "quick-cashout-subtitle": "ডিফল্ট এজেন্টে তাৎক্ষণিক উত্তোলন",
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
    this.renderRecentTransactions();
    this.updateBonusCardState();
  }

  updateBalance() {
    this.normalizeUserData();
    if (this.user) {
      updateBalanceDisplay(this.user.balance);
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
      } else {
        lastTransaction.textContent =
          this.currentLang === "bn" ? "কোন লেনদেন নেই" : "No transactions";
      }
    }
  }

  updateBonusCardState() {
    this.normalizeUserData();

    const bonusLink = document.getElementById("home-bonus-link");
    const bonusText = document.getElementById("get-bonus-text");
    const bonusStatus = document.getElementById("get-bonus-status");

    if (!bonusLink || !bonusText || !bonusStatus) return;

    const today = new Date().toDateString();
    const claimed =
      this.user?.lastBonusDate === today ||
      (this.user?.transactions || []).some(
        (tx) =>
          tx.type === TRANSACTION_TYPES.BONUS &&
          new Date(tx.date).toDateString() === today,
      );

    bonusLink.classList.toggle("opacity-60", claimed);
    bonusLink.classList.toggle("grayscale", claimed);
    bonusLink.classList.toggle("pointer-events-none", claimed);
    bonusLink.classList.toggle("cursor-not-allowed", claimed);
    bonusLink.setAttribute("aria-disabled", claimed ? "true" : "false");

    if (claimed) {
      bonusLink.removeAttribute("href");
      bonusText.textContent =
        this.currentLang === "bn" ? "বোনাস নেওয়া হয়েছে" : "Bonus Claimed";
      bonusStatus.textContent =
        this.currentLang === "bn" ? "আজই নেওয়া হয়েছে" : "Claimed today";
      bonusStatus.className =
        "text-[10px] px-2 py-1 rounded-full bg-base-300 text-base-content/70";
    } else {
      bonusLink.setAttribute("href", "get-bonus.html");
      bonusText.textContent =
        this.currentLang === "bn" ? "বোনাস নিন" : "Get Bonus";
      bonusStatus.textContent =
        this.currentLang === "bn" ? "উপলব্ধ" : "Available";
      bonusStatus.className =
        "text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary";
    }
  }

  renderRecentTransactions() {
    const container = document.getElementById("recent-transactions");
    if (!container) return;

    this.normalizeUserData();
    const transactions = this.user?.transactions || [];

    if (transactions.length === 0) {
      const noTransText =
        this.currentLang === "bn"
          ? "কোন সাম্প্রতিক লেনদেন নেই"
          : "No recent transactions";
      container.innerHTML = `
        <div class="text-center py-4 text-neutral/50 text-sm">
          <i class="fa-solid fa-inbox text-2xl mb-2 block"></i>
          <span>${noTransText}</span>
        </div>
      `;
      return;
    }

    const recent = transactions.slice(0, 3);

    container.innerHTML = recent
      .map((tx) => {
        const isDeposit =
          tx.type === TRANSACTION_TYPES.DEPOSIT ||
          tx.type === TRANSACTION_TYPES.BONUS;
        const sign = isDeposit ? "+" : "-";
        const color = isDeposit ? "text-success" : "text-error";
        const icon = isDeposit ? "📈" : "📉";

        return `
          <div class="flex justify-between items-center p-3 bg-base-100 rounded-xl shadow-sm">
            <div class="flex items-center gap-2">
              <span class="text-lg">${icon}</span>
              <div>
                <p class="text-sm font-medium truncate max-w-[200px]">${this.escapeHtml(tx.description)}</p>
                <p class="text-xs text-neutral/40">${new Date(tx.date).toLocaleDateString()}</p>
              </div>
            </div>
            <span class="${color} font-bold text-sm">${sign}$${tx.amount.toFixed(2)}</span>
          </div>
        `;
      })
      .join("");
  }

  // ==================== QUICK ACTIONS ====================

  setupQuickActions() {
    const quickAddBtn = document.getElementById("quick-add-100");
    if (quickAddBtn) {
      quickAddBtn.addEventListener("click", async () => {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
          const result = await BankService.addMoney(
            this.userId,
            100,
            "Quick Deposit",
            "01234567890",
          );

          if (result.success) {
            this.user.balance = result.data.newBalance;
            this.user.transactions = [
              result.data.transaction,
              ...(this.user.transactions || []),
            ];
            SessionManager.setSession(
              sessionStorage.getItem("payoo_token"),
              this.user,
            );

            this.refreshDashboard();

            const msg =
              this.currentLang === "bn"
                ? "✅ দ্রুত $১০০ যোগ করা হয়েছে!"
                : "✅ Quick added $100 successfully!";
            displaySuccess(msg);
          } else {
            displayError(result.error);
          }
        } catch (error) {
          console.error("Quick add error:", error);
          displayError("Quick add failed. Please try again.");
        } finally {
          this.isProcessing = false;
        }
      });
    }

    const quickCashoutBtn = document.getElementById("quick-cashout-50");
    if (quickCashoutBtn) {
      quickCashoutBtn.addEventListener("click", async () => {
        if (this.isProcessing) return;

        if (this.user.balance < 50) {
          const msg =
            this.currentLang === "bn"
              ? "পর্যাপ্ত ব্যালেন্স নেই"
              : "Insufficient balance";
          displayError(msg);
          return;
        }

        this.isProcessing = true;

        try {
          const result = await BankService.cashout(
            this.userId,
            "09876543210",
            50,
          );

          if (result.success) {
            this.user.balance = result.data.newBalance;
            this.user.transactions = [
              result.data.transaction,
              ...(this.user.transactions || []),
            ];
            SessionManager.setSession(
              sessionStorage.getItem("payoo_token"),
              this.user,
            );

            this.refreshDashboard();

            const msg =
              this.currentLang === "bn"
                ? "✅ দ্রুত $৫০ ক্যাশআউট সম্পন্ন!"
                : "✅ Quick cashed out $50 successfully!";
            displaySuccess(msg);
          } else {
            displayError(result.error);
          }
        } catch (error) {
          console.error("Quick cashout error:", error);
          displayError("Quick cashout failed. Please try again.");
        } finally {
          this.isProcessing = false;
        }
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

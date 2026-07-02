/**
 * Dashboard Controller
 * Senior Dev Note: Manages all dashboard functionality with a clean separation of concerns.
 * Uses the service layer for all data operations.
 */

import {
  getValue,
  getNumberValue,
  setText,
  showElement,
  showOnly,
  displayError,
  displaySuccess,
  updateBalanceDisplay,
} from "./dom.js";

import {
  validatePhone,
  validatePin,
  validateAmount,
  validateBankSelection,
  validateBalance,
} from "./validation.js";

import {
  BankService,
  SessionManager,
  TRANSACTION_TYPES,
} from "./bankservice.js";

export class DashboardController {
  constructor() {
    // Check authentication
    this.checkAuth();

    // Get session data
    this.session = SessionManager.getSession();
    this.user = this.session?.user;
    this.userId = this.user?.id;

    // Store PIN separately (in a real app, this would be verified server-side)
    // For demo purposes, we'll store it in memory
    this.userPin = "1234"; // Default PIN for the demo user

    // State
    this.currentBalance = this.user?.balance || 0;
    this.isProcessing = false;
    this.transactions = this.user?.transactions || [];

    // Initialize
    this.init();
  }

  checkAuth() {
    if (!SessionManager.isAuthenticated()) {
      // Redirect to login
      window.location.href = "index.html";
    }
  }

  init() {
    // Set up navigation
    this.setupNavigation();

    // Set up balance display
    this.updateBalance();

    // Set up logout
    this.setupLogout();

    // Set up add money
    this.setupAddMoney();

    // Set up cashout
    this.setupCashout();

    // Optional features that activate only when the matching UI/service exists
    this.setupSendMoney();
    this.setupGetBonus();
    this.setupPayBill();

    // Set up transaction history toggle
    this.setupTransactions();

    // Show default section
    showOnly([]); // Hide all sections by default
    showElement("add-money");
  }

  setupNavigation() {
    // All navigation buttons
    const navButtons = document.querySelectorAll("[data-section]");
    navButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.dataset.section;
        showOnly([section]);

        if (section === "transactions") {
          this.renderTransactions();
        }

        // Update active state
        navButtons.forEach((btn) => btn.classList.remove("btn-primary"));
        button.classList.add("btn-primary");
      });
    });
  }

  setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();

        if (confirm("Are you sure you want to logout?")) {
          SessionManager.clearSession();
          window.location.href = "index.html";
        }
      });
    }
  }

  setupAddMoney() {
    const button = document.getElementById("add-money-btn");
    if (!button) return;

    button.addEventListener("click", async (e) => {
      e.preventDefault();

      if (this.isProcessing) return;

      // Get values
      const bank = getValue("add-money-bank");
      const accountNumber = getValue("add-money-number");
      const amount = getNumberValue("add-money-amount");
      const pin = getValue("add-money-pin");

      // Validate bank
      const bankValidation = validateBankSelection(bank);
      if (!bankValidation.isValid) {
        displayError(bankValidation.error);
        return;
      }

      // Validate account number (reuse phone validation for simplicity)
      const accountValidation = validatePhone(accountNumber);
      if (!accountValidation.isValid) {
        displayError("Invalid account number: " + accountValidation.error);
        return;
      }

      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.isValid) {
        displayError(amountValidation.error);
        return;
      }

      // Validate PIN
      const pinValidation = validatePin(pin);
      if (!pinValidation.isValid) {
        displayError(pinValidation.error);
        return;
      }

      // ✅ FIXED: Verify PIN against stored PIN
      if (pin !== this.userPin) {
        displayError("Invalid PIN. Please check your 4-digit PIN.");
        // Clear the PIN field and refocus
        document.getElementById("add-money-pin").value = "";
        document.getElementById("add-money-pin").focus();
        document.getElementById("add-money-pin").classList.add("input-error");
        setTimeout(() => {
          document
            .getElementById("add-money-pin")
            .classList.remove("input-error");
        }, 1000);
        return;
      }

      // Process transaction
      this.setProcessing(true);

      try {
        const result = await BankService.addMoney(
          this.userId,
          amount,
          bank,
          accountNumber,
        );

        if (!result.success) {
          displayError(result.error);
          this.setProcessing(false);
          return;
        }

        // Update local balance
        this.currentBalance = result.data.newBalance;
        if (result.data.transaction) {
          this.transactions = [result.data.transaction, ...this.transactions];
        }
        this.updateBalance();

        // Show success
        displaySuccess(
          `✅ Successfully added $${amount.toFixed(2)} from ${bank}`,
        );

        // Clear form fields
        document.getElementById("add-money-amount").value = "";
        document.getElementById("add-money-pin").value = "";
        document
          .getElementById("add-money-pin")
          .classList.remove("input-error");

        // Update user data in session
        this.updateUserData();
      } catch (error) {
        console.error("Add money error:", error);
        displayError("Transaction failed. Please try again.");
      } finally {
        this.setProcessing(false);
      }
    });
  }

  setupCashout() {
    const button = document.getElementById("cashout-btn");
    if (!button) return;

    button.addEventListener("click", async (e) => {
      e.preventDefault();

      if (this.isProcessing) return;

      // Get values
      const agentNumber = getValue("cashout-number");
      const amount = getNumberValue("cashout-amount");
      const pin = getValue("cashout-pin");

      // Validate agent number
      const agentValidation = validatePhone(agentNumber);
      if (!agentValidation.isValid) {
        displayError("Invalid agent number: " + agentValidation.error);
        return;
      }

      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.isValid) {
        displayError(amountValidation.error);
        return;
      }

      // Validate balance
      const balanceValidation = validateBalance(amount, this.currentBalance);
      if (!balanceValidation.isValid) {
        displayError(balanceValidation.error);
        return;
      }

      // Validate PIN
      const pinValidation = validatePin(pin);
      if (!pinValidation.isValid) {
        displayError(pinValidation.error);
        return;
      }

      // ✅ FIXED: Verify PIN against stored PIN
      if (pin !== this.userPin) {
        displayError("Invalid PIN. Please check your 4-digit PIN.");
        document.getElementById("cashout-pin").value = "";
        document.getElementById("cashout-pin").focus();
        document.getElementById("cashout-pin").classList.add("input-error");
        setTimeout(() => {
          document
            .getElementById("cashout-pin")
            .classList.remove("input-error");
        }, 1000);
        return;
      }

      // Process transaction
      this.setProcessing(true);

      try {
        const result = await BankService.cashout(
          this.userId,
          agentNumber,
          amount,
        );

        if (!result.success) {
          displayError(result.error);
          this.setProcessing(false);
          return;
        }

        // Update local balance
        this.currentBalance = result.data.newBalance;
        if (result.data.transaction) {
          this.transactions = [result.data.transaction, ...this.transactions];
        }
        this.updateBalance();

        // Show success
        displaySuccess(
          `✅ Successfully withdrew $${amount.toFixed(2)} via agent ${agentNumber}`,
        );

        // Clear form fields
        document.getElementById("cashout-amount").value = "";
        document.getElementById("cashout-pin").value = "";
        document.getElementById("cashout-pin").classList.remove("input-error");

        // Update user data in session
        this.updateUserData();
      } catch (error) {
        console.error("Cashout error:", error);
        displayError("Transaction failed. Please try again.");
      } finally {
        this.setProcessing(false);
      }
    });
  }

  setupSendMoney() {
    const button = document.getElementById("send-money-btn");
    if (!button || typeof BankService.sendMoney !== "function") return;

    button.addEventListener("click", async (e) => {
      e.preventDefault();
      if (this.isProcessing) return;

      const recipientNumber = getValue("send-money-number");
      const amount = getNumberValue("send-money-amount");
      const pin = getValue("send-money-pin");

      const recipientValidation = validatePhone(recipientNumber);
      if (!recipientValidation.isValid) {
        displayError("Invalid recipient number: " + recipientValidation.error);
        return;
      }

      const amountValidation = validateAmount(amount);
      if (!amountValidation.isValid) {
        displayError(amountValidation.error);
        return;
      }

      const balanceValidation = validateBalance(amount, this.currentBalance);
      if (!balanceValidation.isValid) {
        displayError(balanceValidation.error);
        return;
      }

      const pinValidation = validatePin(pin);
      if (!pinValidation.isValid) {
        displayError(pinValidation.error);
        return;
      }

      if (pin !== this.userPin) {
        displayError("Invalid PIN. Please check your 4-digit PIN.");
        document.getElementById("send-money-pin").value = "";
        document.getElementById("send-money-pin").focus();
        return;
      }

      this.setProcessing(true);

      try {
        const result = await BankService.sendMoney(
          this.userId,
          recipientNumber,
          amount,
        );

        if (!result.success) {
          displayError(result.error);
          this.setProcessing(false);
          return;
        }

        this.currentBalance = result.data.newBalance;
        if (result.data.transaction) {
          this.transactions = [result.data.transaction, ...this.transactions];
        }
        this.updateBalance();

        displaySuccess(
          `✅ Successfully sent $${amount.toFixed(2)} to ${result.data.recipientName || recipientNumber}`,
        );

        document.getElementById("send-money-number").value = "";
        document.getElementById("send-money-amount").value = "";
        document.getElementById("send-money-pin").value = "";

        this.updateUserData();
      } catch (error) {
        console.error("Send money error:", error);
        displayError("Transaction failed. Please try again.");
      } finally {
        this.setProcessing(false);
      }
    });
  }

  setupGetBonus() {
    const button = document.getElementById("get-bonus-btn");
    if (!button || typeof BankService.claimBonus !== "function") return;

    button.addEventListener("click", async (e) => {
      e.preventDefault();
      if (this.isProcessing) return;

      this.setProcessing(true);

      try {
        const result = await BankService.claimBonus(this.userId);

        if (!result.success) {
          displayError(result.error);
          this.setProcessing(false);
          return;
        }

        this.currentBalance = result.data.newBalance;
        if (result.data.transaction) {
          this.transactions = [result.data.transaction, ...this.transactions];
        }
        this.updateBalance();

        displaySuccess(
          `🎁 Bonus claimed! +$${result.data.bonusAmount.toFixed(2)}`,
        );

        this.updateUserData();
        this.renderBonusSection();
      } catch (error) {
        console.error("Bonus error:", error);
        displayError("Failed to claim bonus. Please try again.");
      } finally {
        this.setProcessing(false);
      }
    });
  }

  setupPayBill() {
    const button = document.getElementById("pay-bill-btn");
    if (!button || typeof BankService.payBill !== "function") return;

    button.addEventListener("click", async (e) => {
      e.preventDefault();
      if (this.isProcessing) return;

      const category = getValue("bill-category");
      const accountNumber = getValue("bill-account");
      const amount = getNumberValue("bill-amount");
      const pin = getValue("bill-pin");

      if (!category || category === "select-category") {
        displayError("Please select a bill category");
        return;
      }

      if (!accountNumber || accountNumber.length < 5) {
        displayError("Please enter a valid bill account number");
        return;
      }

      const amountValidation = validateAmount(amount);
      if (!amountValidation.isValid) {
        displayError(amountValidation.error);
        return;
      }

      const balanceValidation = validateBalance(amount, this.currentBalance);
      if (!balanceValidation.isValid) {
        displayError(balanceValidation.error);
        return;
      }

      const pinValidation = validatePin(pin);
      if (!pinValidation.isValid) {
        displayError(pinValidation.error);
        return;
      }

      if (pin !== this.userPin) {
        displayError("Invalid PIN. Please check your 4-digit PIN.");
        document.getElementById("bill-pin").value = "";
        document.getElementById("bill-pin").focus();
        return;
      }

      this.setProcessing(true);

      try {
        const result = await BankService.payBill(
          this.userId,
          category,
          accountNumber,
          amount,
        );

        if (!result.success) {
          displayError(result.error);
          this.setProcessing(false);
          return;
        }

        this.currentBalance = result.data.newBalance;
        if (result.data.transaction) {
          this.transactions = [result.data.transaction, ...this.transactions];
        }
        this.updateBalance();

        displaySuccess(
          `✅ ${result.data.category || category} bill paid: $${amount.toFixed(2)}`,
        );

        document.getElementById("bill-account").value = "";
        document.getElementById("bill-amount").value = "";
        document.getElementById("bill-pin").value = "";

        this.updateUserData();
      } catch (error) {
        console.error("Pay bill error:", error);
        displayError("Transaction failed. Please try again.");
      } finally {
        this.setProcessing(false);
      }
    });
  }

  setupTransactions() {
    const button = document.querySelector('[data-section="transactions"]');
    if (!button) return;

    button.addEventListener("click", () => {
      setTimeout(() => {
        this.renderTransactions();
      }, 100);
    });
  }

  renderTransactions() {
    const container = document.getElementById("transactions-container");
    if (!container) return;

    const session = SessionManager.getSession();
    if (session && session.user) {
      this.user = session.user;
      this.transactions = this.user.transactions || this.transactions;
    }

    const transactions = this.transactions || [];

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-neutral/50">No transactions yet</p>
          <p class="text-xs text-neutral/30 mt-1">Start using Payoo to see your history</p>
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
        const sign = isDeposit ? "+" : "-";
        const color = isDeposit ? "text-success" : "text-error";
        const icon = isDeposit ? "📈" : "📉";

        return `
        <div class="flex justify-between items-center p-4 bg-base-200 rounded-xl mb-2 hover:shadow-md transition-shadow">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
              ${icon}
            </div>
            <div>
              <p class="font-medium">${tx.description}</p>
              <p class="text-xs text-neutral/50">${new Date(tx.date).toLocaleString()}</p>
            </div>
          </div>
          <div class="${color} font-bold">
            ${sign}$${tx.amount.toFixed(2)}
          </div>
        </div>
      `;
      })
      .join("");
  }

  renderBonusSection() {
    const container = document.getElementById("get-bonus");
    if (!container) return;

    const today = new Date().toDateString();
    const isClaimed = this.user?.lastBonusDate === today;

    if (isClaimed) {
      container.innerHTML = `
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
          <i class="fa-solid fa-gift text-primary"></i>
          Get Bonus
        </h2>
        <div class="card bg-base-100 w-full shadow rounded-2xl">
          <div class="card-body">
            <div class="text-center py-8">
              <div class="text-6xl mb-4">✅</div>
              <h3 class="text-2xl font-bold mb-2">Bonus Claimed Today!</h3>
              <p class="text-neutral/50">Come back tomorrow for more rewards</p>
              <div class="mt-4 p-4 bg-success/10 rounded-xl">
                <p class="text-sm text-success">🎉 You've earned your daily bonus</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  updateBalance() {
    updateBalanceDisplay(this.currentBalance);
    // Also update the user object
    if (this.user) {
      this.user.balance = this.currentBalance;
    }
  }

  updateUserData() {
    // Update the user data in session
    if (this.user) {
      this.user.balance = this.currentBalance;
      this.user.transactions = this.transactions;
      SessionManager.setSession(
        sessionStorage.getItem("payoo_token"),
        this.user,
      );
    }
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const buttons = document.querySelectorAll(".transaction-btn");
    buttons.forEach((btn) => {
      btn.disabled = processing;
      if (processing) {
        btn.innerHTML =
          '<span class="loading loading-spinner loading-sm"></span> Processing...';
      } else {
        // Reset button text based on its id
        if (btn.id === "add-money-btn") btn.textContent = "Add Money";
        if (btn.id === "cashout-btn") btn.textContent = "Withdraw Money";
      }
    });
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new DashboardController();
});

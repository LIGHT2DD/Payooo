/**
 * Cashout Page Controller
 */

import { getValue, getNumberValue, displayError, displaySuccess, updateBalanceDisplay } from "../dom.js";
import { validatePhone, validatePin, validateAmount, validateBalance } from "../validation.js";
import { BankService, SessionManager } from "../bankservice.js";

class CashoutController {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.userId = this.user.id;
    this.userPin = this.user?.pin;
    this.isProcessing = false;

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);

    document.getElementById("cashout-btn").addEventListener("click", (e) => {
      e.preventDefault();
      this.handleCashout();
    });

    document.getElementById("cashout-pin").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleCashout();
      }
    });
  }

  async handleCashout() {
    if (this.isProcessing) return;

    const agentNumber = getValue("cashout-number");
    const amount = getNumberValue("cashout-amount");
    const pin = getValue("cashout-pin");

    const agentValidation = validatePhone(agentNumber);
    if (!agentValidation.isValid) {
      displayError("Invalid agent number: " + agentValidation.error);
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      return;
    }

    const balanceValidation = validateBalance(amount, this.user.balance);
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
      const pinInput = document.getElementById("cashout-pin");
      pinInput.value = "";
      pinInput.focus();
      pinInput.classList.add("input-error");
      setTimeout(() => pinInput.classList.remove("input-error"), 1000);
      return;
    }

    if (!window.confirm(`Confirm cashout of ৳${amount.toFixed(2)} to agent ${agentNumber}?`)) {
      return;
    }

    this.setProcessing(true);

    try {
      const result = await BankService.cashout(this.userId, agentNumber, amount);

      if (!result.success) {
        displayError(result.error);
        this.setProcessing(false);
        return;
      }

      this.user.balance = result.data.newBalance;
      this.user.transactions = result.data.allTransactions || [];
      SessionManager.setSession(sessionStorage.getItem("payoo_token"), this.user);

      updateBalanceDisplay(this.user.balance);

      displaySuccess(`✅ Successfully withdrew $${amount.toFixed(2)} via agent ${agentNumber}`);

      // Dispatch event to notify other pages (like dashboard) of transaction
      window.dispatchEvent(new CustomEvent("payoo:transaction"));

      document.getElementById("cashout-amount").value = "";
      document.getElementById("cashout-pin").value = "";
      document.dispatchEvent(new Event("payoo:clear-draft"));
      document.getElementById("cashout-pin").classList.remove("input-error");
    } catch (error) {
      console.error("Cashout error:", error);
      displayError("Transaction failed. Please try again.");
    } finally {
      this.setProcessing(false);
    }
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const button = document.getElementById("cashout-btn");
    button.disabled = processing;
    button.innerHTML = processing
      ? '<span class="loading loading-spinner loading-sm"></span> Processing...'
      : '<i class="fa-solid fa-arrow-up-from-bracket"></i> Withdraw Money';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CashoutController();
});

/**
 * Add Money Page Controller
 */

import { getValue, getNumberValue, displayError, displaySuccess, updateBalanceDisplay } from "../dom.js";
import { validatePhone, validatePin, validateAmount, validateBankSelection } from "../validation.js";
import { BankService, SessionManager } from "../bankservice.js";

class AddMoneyController {
  constructor() {
    // Check authentication
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.userId = this.user.id;
    this.userPin = "1234";
    this.isProcessing = false;

    this.init();
  }

  init() {
    // Update balance display
    updateBalanceDisplay(this.user.balance);

    // Setup event listeners
    const addMoneyBtn = document.getElementById("add-money-btn");
    if (addMoneyBtn) {
      addMoneyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleAddMoney();
      });
    }

    // Allow Enter key to submit
    const pinInput = document.getElementById("add-money-pin");
    if (pinInput) {
      pinInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleAddMoney();
        }
      });
    }
  }

  async handleAddMoney() {
    if (this.isProcessing) return;

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

    // Validate account number
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

    // Verify PIN
    if (pin !== this.userPin) {
      displayError("Invalid PIN. Please check your 4-digit PIN.");
      const pinInput = document.getElementById("add-money-pin");
      if (pinInput) {
        pinInput.value = "";
        pinInput.focus();
        pinInput.classList.add("input-error");
        setTimeout(() => pinInput.classList.remove("input-error"), 1000);
      }
      return;
    }

    this.setProcessing(true);

    try {
      const result = await BankService.addMoney(this.userId, amount, bank, accountNumber);

      if (!result.success) {
        displayError(result.error);
        this.setProcessing(false);
        return;
      }

      // Update session data
      this.user.balance = result.data.newBalance;
      if (result.data.transaction) {
        if (!this.user.transactions) {
          this.user.transactions = [];
        }
        this.user.transactions.unshift(result.data.transaction);
      }
      SessionManager.setSession(sessionStorage.getItem("payoo_token"), this.user);

      // Update display
      updateBalanceDisplay(this.user.balance);

      displaySuccess(`✅ Successfully added $${amount.toFixed(2)} from ${bank}`);

      // Clear form
      document.getElementById("add-money-amount").value = "";
      document.getElementById("add-money-pin").value = "";
      const pinInput = document.getElementById("add-money-pin");
      if (pinInput) pinInput.classList.remove("input-error");
    } catch (error) {
      console.error("Add money error:", error);
      displayError("Transaction failed. Please try again.");
    } finally {
      this.setProcessing(false);
    }
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const button = document.getElementById("add-money-btn");
    if (button) {
      button.disabled = processing;
      button.innerHTML = processing
        ? '<span class="loading loading-spinner loading-sm"></span> Processing...'
        : '<i class="fa-solid fa-plus"></i> Add Money';
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new AddMoneyController();
});
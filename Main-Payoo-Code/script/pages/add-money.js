/**
 * Add Money Page Controller
 */

import {
  getValue,
  getNumberValue,
  displayError,
  displaySuccess,
  updateBalanceDisplay,
} from "../dom.js";
import {
  validatePhone,
  validatePin,
  validateAmount,
  validateBankSelection,
} from "../validation.js";
import { BankService, SessionManager } from "../bankservice.js";

class AddMoneyController {
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

    const addMoneyBtn = document.getElementById("add-money-btn");
    if (addMoneyBtn) {
      addMoneyBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleAddMoney();
      });
    }

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

    const bankValidation = validateBankSelection(bank);
    if (!bankValidation.isValid) {
      displayError(bankValidation.error);
      return;
    }

    const accountValidation = validatePhone(accountNumber);
    if (!accountValidation.isValid) {
      displayError("Invalid account number: " + accountValidation.error);
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      return;
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      displayError(pinValidation.error);
      return;
    }

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

      this.user.balance = result.data.newBalance;
      this.user.transactions = result.data.allTransactions || [];
      SessionManager.setSession(
        sessionStorage.getItem("payoo_token"),
        this.user,
      );

      updateBalanceDisplay(this.user.balance);

      displaySuccess(
        `✅ Successfully added $${amount.toFixed(2)} from ${bank}`,
      );

      // Dispatch event to notify other pages (like dashboard) of transaction
      window.dispatchEvent(new CustomEvent("payoo:transaction"));

      document.getElementById("add-money-amount").value = "";
      document.getElementById("add-money-pin").value = "";
      document.dispatchEvent(new Event("payoo:clear-draft"));
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
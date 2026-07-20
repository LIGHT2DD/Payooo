/**
 * Get Bonus Page Controller
 * Handles the daily bonus claim functionality
 */

import { updateBalanceDisplay, displaySuccess, displayError } from "../dom.js";
import { SessionManager, BankService } from "../bankservice.js";

class GetBonusController {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.isProcessing = false;

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    this.updateBonusState();

    document.getElementById("claim-bonus-btn").addEventListener("click", () => {
      this.handleClaimBonus();
    });
  }

  updateBonusState() {
    const lastClaim = localStorage.getItem("payoo_last_bonus_claim");
    const today = new Date().toDateString();
    const claimBtn = document.getElementById("claim-bonus-btn");
    const messageEl = document.getElementById("bonus-message");

    if (lastClaim === today) {
      claimBtn.disabled = true;
      claimBtn.innerHTML = '<i class="fa-solid fa-check"></i> Claimed Today';
      if (messageEl) {
        messageEl.textContent = "You've already claimed your daily bonus. Come back tomorrow!";
      }
    } else {
      claimBtn.disabled = false;
      claimBtn.innerHTML = '<i class="fa-solid fa-gift"></i> Claim Bonus';
      if (messageEl) {
        messageEl.textContent = "Claim your daily bonus now and receive $5.00.";
      }
    }
  }

  async handleClaimBonus() {
    if (this.isProcessing) return;

    this.setProcessing(true);

    try {
      const result = await BankService.claimBonus(this.user.id);

      if (result.success) {
        // Update user data
        this.user.balance = result.data.newBalance;
        this.user.transactions = result.data.allTransactions;
        SessionManager.setSession(
          sessionStorage.getItem("payoo_token"),
          this.user,
        );

        // Store last claim date
        localStorage.setItem("payoo_last_bonus_claim", new Date().toDateString());

        // Update display
        updateBalanceDisplay(this.user.balance);
        this.updateBonusState();

        // Show success message
        displaySuccess(`Bonus claimed! $${result.data.bonusAmount} added to your account.`);

        // Dispatch event to notify other pages
        window.dispatchEvent(new CustomEvent("payoo:transaction"));
      } else {
        displayError(result.error);
      }
    } catch (error) {
      displayError("Failed to claim bonus. Please try again.");
    }

    this.setProcessing(false);
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const button = document.getElementById("claim-bonus-btn");
    if (button && !processing) {
      // Button state is managed by updateBonusState
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GetBonusController();
});
import { updateBalanceDisplay, displaySuccess, displayError, getValue, getNumberValue } from "../dom.js";
import { validateAmount, validateBalance } from "../validation.js";
import { SessionManager } from "../bankservice.js";

class DonateController {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.donations = JSON.parse(localStorage.getItem("donations") || "[]");
    this.isProcessing = false;

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    this.renderDonations();

    document.getElementById("donate-btn").addEventListener("click", () => {
      this.handleDonate();
    });
  }

  handleDonate() {
    if (this.isProcessing) return;

    const amount = getNumberValue("donate-amount");

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      return;
    }

    // Validate balance
    const balanceValidation = validateBalance(amount, this.user.balance);
    if (!balanceValidation.isValid) {
      displayError(balanceValidation.error);
      return;
    }

    this.setProcessing(true);

    // Deduct from balance
         this.user.balance -= amount;
         this.user.transactions = this.user.transactions || [];
         this.user.transactions.unshift({
           id: `t${Date.now()}`,
           type: "donation",
           amount: amount,
           date: new Date().toISOString(),
           description: `Donation - $${amount}`
         });
         SessionManager.setSession(sessionStorage.getItem("payoo_token"), this.user);

         this.donations.unshift({
           id: Date.now(),
           amount: amount,
           date: new Date().toISOString()
         });

         localStorage.setItem("donations", JSON.stringify(this.donations));
         updateBalanceDisplay(this.user.balance);
         this.renderDonations();
    
    document.getElementById("donate-amount").value = "";
    displaySuccess(`Thank you for donating $${amount}!`);

    // Dispatch event to notify other pages (like dashboard) of transaction
    window.dispatchEvent(new CustomEvent("payoo:transaction"));
    
    this.setProcessing(false);
  }

  setProcessing(processing) {
    this.isProcessing = processing;
    const button = document.getElementById("donate-btn");
    if (button) {
      button.disabled = processing;
      button.innerHTML = processing
        ? '<span class="loading loading-spinner loading-sm"></span> Processing...'
        : '<i class="fa-solid fa-heart"></i> Donate';
    }
  }

  renderDonations() {
    const container = document.getElementById("donations-list");
    
    if (this.donations.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-neutral/50"><p>No donations yet</p></div>';
      return;
    }

    container.innerHTML = this.donations.slice(0, 5).map(donation => `
      <div class="flex justify-between items-center p-3 bg-base-100 rounded-xl shadow-sm">
        <div>
          <p class="font-medium text-sm">Donation</p>
          <p class="text-xs text-neutral/50">${new Date(donation.date).toLocaleDateString()}</p>
        </div>
        <span class="text-error font-bold">-$${donation.amount}</span>
      </div>
    `).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new DonateController();
});
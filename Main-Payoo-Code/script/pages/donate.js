import { updateBalanceDisplay, displaySuccess, displayError } from "../dom.js";
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

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    this.renderDonations();

    document.getElementById("donate-btn").addEventListener("click", () => {
      const amount = parseFloat(document.getElementById("donate-amount").value);

      if (!amount || amount <= 0) {
        displayError("Please enter a valid amount");
        return;
      }

      if (amount > this.user.balance) {
        displayError("Insufficient balance");
        return;
      }

      this.user.balance -= amount;
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
    });
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
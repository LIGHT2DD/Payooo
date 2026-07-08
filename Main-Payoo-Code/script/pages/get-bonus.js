import { updateBalanceDisplay, displayError, displaySuccess } from "../dom.js";
import { SessionManager, BankService } from "../bankservice.js";

class GetBonusController {
  constructor() {
    const session = SessionManager.getSession();
    if (!session?.user) {
      window.location.href = "../index.html";
      return;
    }

    this.user = session.user;
    this.userId = this.user.id;
    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    this.attachEvents();
    this.renderStatus();
  }

  attachEvents() {
    const button = document.getElementById("claim-bonus-btn");
    if (button) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        button.innerHTML =
          '<span class="loading loading-spinner loading-sm"></span> Claiming...';

        try {
          const result = await BankService.claimBonus(this.userId);

          if (result.success) {
            this.user.balance = result.data.newBalance;
            this.user.lastBonusDate = new Date().toDateString();
            this.user.transactions = [
              result.data.transaction,
              ...(this.user.transactions || []),
            ];
            SessionManager.setSession(
              sessionStorage.getItem("payoo_token"),
              this.user,
            );
            updateBalanceDisplay(this.user.balance);
            this.renderStatus();
            displaySuccess(
              `Bonus received: $${result.data.bonusAmount.toFixed(2)}`,
            );
          } else {
            displayError(result.error);
          }
        } catch (error) {
          console.error("Bonus claim error:", error);
          displayError("Unable to claim bonus right now.");
        } finally {
          button.disabled = false;
          button.innerHTML = '<i class="fa-solid fa-gift"></i> Claim Bonus';
        }
      });
    }
  }

  renderStatus() {
    const message = document.getElementById("bonus-message");
    if (!message) return;

    const today = new Date().toDateString();
    const alreadyClaimed = this.user.lastBonusDate === today;

    message.innerHTML = alreadyClaimed
      ? '<span class="text-success">You already claimed your daily bonus today.</span>'
      : '<span class="text-primary">Claim your daily bonus now and receive $5.00.</span>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new GetBonusController();
});

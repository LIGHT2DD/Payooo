import {
  updateBalanceDisplay,
  displaySuccess,
  displayError,
  getValue,
  getNumberValue,
} from "../dom.js";
import { validatePin, validateAmount } from "../validation.js";
import { SessionManager } from "../bankservice.js";

class SavingsController {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    this.session = SessionManager.getSession();
    this.user = this.session.user;
    this.goals = JSON.parse(localStorage.getItem("savings_goals") || "[]");
    this.userPin = "1234";
    this.selectedGoal = null;

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    this.renderGoals();
    this.updateTotalSavings();

    document.getElementById("add-goal-btn").addEventListener("click", () => {
      const name = document.getElementById("goal-name").value.trim();
      const amount = parseFloat(document.getElementById("goal-amount").value);

      if (!name || !amount || amount <= 0) {
        displayError("Please enter valid goal name and amount");
        return;
      }

      this.goals.push({
        id: Date.now(),
        name: name,
        target: amount,
        saved: 0,
        date: new Date().toISOString(),
      });

      localStorage.setItem("savings_goals", JSON.stringify(this.goals));
      this.renderGoals();
      this.updateTotalSavings();

      document.getElementById("goal-name").value = "";
      document.getElementById("goal-amount").value = "";
      displaySuccess("Savings goal added!");
    });

    // Setup modal confirm button
    document
      .getElementById("confirm-add-money-btn")
      .addEventListener("click", () => {
        this.handleAddMoneyToGoal();
      });
  }

  updateTotalSavings() {
    const total = this.goals.reduce((sum, goal) => sum + goal.saved, 0);
    document.getElementById("total-savings").textContent = total;
    document.querySelector("progress").value =
      this.goals.length > 0 ? (total / this.goals[0].target) * 100 : 0;
  }

  openAddMoneyModal(goalId) {
    const goal = this.goals.find((g) => g.id === goalId);
    if (!goal) return;

    this.selectedGoal = goal;

    // Populate modal
    document.getElementById("modal-goal-name").textContent = goal.name;
    document.getElementById("modal-balance").textContent = this.user.balance;
    document.getElementById("modal-target").textContent = goal.target;
    document.getElementById("modal-saved").textContent = goal.saved;
    document.getElementById("add-amount").value = "";
    document.getElementById("add-pin").value = "";

    // Show modal
    document.getElementById("add-money-modal").showModal();
  }

  handleAddMoneyToGoal() {
    if (!this.selectedGoal) return;

    // Check if goal is already complete
    if (this.selectedGoal.saved >= this.selectedGoal.target) {
      displayError(
        "This goal has already been completed! Create a new goal to continue saving.",
      );
      document.getElementById("add-money-modal").close();
      return;
    }

    const amount = getNumberValue("add-amount");
    const pin = getValue("add-pin");

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      displayError(amountValidation.error);
      return;
    }

    // Check if amount exceeds balance
    if (amount > this.user.balance) {
      displayError(
        "Insufficient balance. Please add money to your account first.",
      );
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
      document.getElementById("add-pin").value = "";
      document.getElementById("add-pin").focus();
      return;
    }

    // Deduct from balance
    this.user.balance -= amount;

    // Add to goal
    this.selectedGoal.saved += amount;

    // Update storage
    localStorage.setItem("savings_goals", JSON.stringify(this.goals));

    // Update session with new user data
    SessionManager.updateUser(this.user);

    // Refresh session data
    this.session = SessionManager.getSession();

    // Update display
    updateBalanceDisplay(this.user.balance);
    this.renderGoals();
    this.updateTotalSavings();

    // Close modal
    document.getElementById("add-money-modal").close();

    // Show success message
    displaySuccess(`$${amount} added to "${this.selectedGoal.name}"!`);
  }

  renderGoals() {
    const container = document.getElementById("goals-list");

    if (this.goals.length === 0) {
      container.innerHTML =
        '<div class="text-center py-4 text-neutral/50"><p>No savings goals yet</p></div>';
      return;
    }

    container.innerHTML = this.goals
      .map((goal) => {
        const progress = (goal.saved / goal.target) * 100;
        const isComplete = goal.saved >= goal.target;
        return `
        <div class="card bg-base-100 shadow rounded-xl" data-goal-id="${goal.id}">
          <div class="card-body">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-bold">${goal.name}</h3>
              <button class="btn btn-ghost btn-xs delete-goal-btn">✕</button>
            </div>
            <div class="flex justify-between text-sm mb-3">
              <span>$${goal.saved} / $${goal.target}</span>
              <span>${progress.toFixed(0)}%</span>
            </div>
            <progress class="progress progress-success w-full mb-3" value="${progress}" max="100"></progress>
            ${
              isComplete
                ? `<div class="text-center text-success font-bold"><i class="fa-solid fa-check-circle"></i> Goal Completed!</div>`
                : `<button class="btn btn-sm btn-success rounded-full w-full add-money-btn" type="button">
                  <i class="fa-solid fa-plus"></i> Add Money
                </button>`
            }
          </div>
        </div>
      `;
      })
      .join("");

    // Attach event listeners to add money buttons
    const self = this;
    container.querySelectorAll(".add-money-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest("[data-goal-id]");
        const goalId = parseInt(card.dataset.goalId);
        self.openAddMoneyModal(goalId);
      });
    });

    // Attach event listeners to delete buttons
    container.querySelectorAll(".delete-goal-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest("[data-goal-id]");
        const goalId = parseInt(card.dataset.goalId);
        self.deleteGoal(goalId);
      });
    });
  }

  deleteGoal(goalId) {
    this.goals = this.goals.filter((g) => g.id !== goalId);
    localStorage.setItem("savings_goals", JSON.stringify(this.goals));
    this.renderGoals();
    this.updateTotalSavings();
    displaySuccess("Goal deleted!");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new SavingsController();
});

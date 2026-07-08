import { updateBalanceDisplay, displaySuccess, displayError } from "../dom.js";
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
        date: new Date().toISOString()
      });

      localStorage.setItem("savings_goals", JSON.stringify(this.goals));
      this.renderGoals();
      this.updateTotalSavings();
      
      document.getElementById("goal-name").value = "";
      document.getElementById("goal-amount").value = "";
      displaySuccess("Savings goal added!");
    });
  }

  updateTotalSavings() {
    const total = this.goals.reduce((sum, goal) => sum + goal.saved, 0);
    document.getElementById("total-savings").textContent = total;
    document.querySelector("progress").value = this.goals.length > 0 ? (total / this.goals[0].target) * 100 : 0;
  }

  renderGoals() {
    const container = document.getElementById("goals-list");
    
    if (this.goals.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-neutral/50"><p>No savings goals yet</p></div>';
      return;
    }

    container.innerHTML = this.goals.map(goal => {
      const progress = (goal.saved / goal.target) * 100;
      return `
        <div class="card bg-base-100 shadow rounded-xl">
          <div class="card-body">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-bold">${goal.name}</h3>
              <button onclick="this.closest('.card').remove()" class="btn btn-ghost btn-xs">✕</button>
            </div>
            <div class="flex justify-between text-sm mb-2">
              <span>$${goal.saved} / $${goal.target}</span>
              <span>${progress.toFixed(0)}%</span>
            </div>
            <progress class="progress progress-success w-full" value="${progress}" max="100"></progress>
          </div>
        </div>
      `;
    }).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new SavingsController();
});
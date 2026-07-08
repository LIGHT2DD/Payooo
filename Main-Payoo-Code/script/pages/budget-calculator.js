import { displayError } from "../dom.js";

class BudgetCalculator {
  constructor() {
    this.init();
  }

  init() {
    document.getElementById("calculate-btn").addEventListener("click", () => {
      this.calculateBudget();
    });
  }

  calculateBudget() {
    const income = parseFloat(document.getElementById("monthly-income").value) || 0;
    const housing = parseFloat(document.getElementById("expense-housing").value) || 0;
    const food = parseFloat(document.getElementById("expense-food").value) || 0;
    const transport = parseFloat(document.getElementById("expense-transport").value) || 0;
    const utilities = parseFloat(document.getElementById("expense-utilities").value) || 0;

    if (income <= 0) {
      displayError("Please enter your monthly income");
      return;
    }

    const totalExpenses = housing + food + transport + utilities;
    const remaining = income - totalExpenses;
    const savingsRate = ((remaining / income) * 100).toFixed(1);

    const results = document.getElementById("budget-results");
    const summary = document.getElementById("budget-summary");

    results.classList.remove("hidden");

    summary.innerHTML = `
      <div class="flex justify-between p-2 bg-base-200 rounded-lg">
        <span>Income</span>
        <span class="font-bold text-success">$${income}</span>
      </div>
      <div class="flex justify-between p-2 bg-base-200 rounded-lg">
        <span>Expenses</span>
        <span class="font-bold text-error">$${totalExpenses}</span>
      </div>
      <div class="flex justify-between p-2 bg-base-200 rounded-lg">
        <span>Remaining</span>
        <span class="font-bold ${remaining >= 0 ? 'text-success' : 'text-error'}">$${remaining}</span>
      </div>
      <div class="flex justify-between p-2 bg-base-200 rounded-lg">
        <span>Savings Rate</span>
        <span class="font-bold">${savingsRate}%</span>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new BudgetCalculator();
});
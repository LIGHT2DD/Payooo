import { displayError, displaySuccess, updateBalanceDisplay } from "../dom.js";
import { SessionManager } from "../bankservice.js";

const fields = ["monthly-income", "expense-housing", "expense-food", "expense-transport", "expense-utilities"];

class BudgetCalculator {
  constructor() {
    const session = SessionManager.getSession();
    if (!session?.user) return (window.location.href = "index.html");
    this.user = session.user;
    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    document.getElementById("calculate-btn").addEventListener("click", () => this.calculateBudget());
    this.addScenarioPanel();
    this.renderScenarios();
  }

  values() { return Object.fromEntries(fields.map((id) => [id, Number(document.getElementById(id).value) || 0])); }

  calculateBudget() {
    const values = this.values();
    if (values["monthly-income"] <= 0) return displayError("Please enter your monthly income");
    const expenses = values["expense-housing"] + values["expense-food"] + values["expense-transport"] + values["expense-utilities"];
    const remaining = values["monthly-income"] - expenses;
    const savingsRate = (remaining / values["monthly-income"]) * 100;
    document.getElementById("budget-results").classList.remove("hidden");
    document.getElementById("budget-summary").innerHTML = `
      <div class="flex justify-between p-2 bg-base-200 rounded-lg"><span>Income</span><span class="font-bold text-success">$${values["monthly-income"].toLocaleString()}</span></div>
      <div class="flex justify-between p-2 bg-base-200 rounded-lg"><span>Expenses</span><span class="font-bold text-error">$${expenses.toLocaleString()}</span></div>
      <div class="flex justify-between p-2 bg-base-200 rounded-lg"><span>Remaining</span><span class="font-bold ${remaining >= 0 ? "text-success" : "text-error"}">$${remaining.toLocaleString()}</span></div>
      <div class="flex justify-between p-2 bg-base-200 rounded-lg"><span>Savings Rate</span><span class="font-bold">${savingsRate.toFixed(1)}%</span></div>
      <button id="save-scenario-btn" class="btn btn-outline btn-sm w-full mt-2"><i class="fa-solid fa-bookmark"></i> Save scenario</button>`;
    document.getElementById("save-scenario-btn").addEventListener("click", () => this.saveScenario(values, remaining));
  }

  addScenarioPanel() {
    const section = document.getElementById("budget-results")?.parentElement;
    if (!section || document.getElementById("budget-scenarios")) return;
    const panel = document.createElement("div");
    panel.id = "budget-scenarios";
    panel.className = "card bg-base-100 shadow rounded-2xl";
    panel.innerHTML = '<div class="card-body"><h3 class="font-bold">Saved scenarios</h3><div id="scenario-list" class="space-y-2 text-sm"></div></div>';
    section.append(panel);
  }

  saveScenario(values, remaining) {
    const scenarios = JSON.parse(localStorage.getItem("payoo:budget-scenarios") || "[]");
    scenarios.unshift({ id: Date.now(), values, remaining, createdAt: new Date().toISOString() });
    localStorage.setItem("payoo:budget-scenarios", JSON.stringify(scenarios.slice(0, 6)));
    this.renderScenarios();
    displaySuccess("Budget scenario saved");
  }

  renderScenarios() {
    const list = document.getElementById("scenario-list");
    if (!list) return;
    const scenarios = JSON.parse(localStorage.getItem("payoo:budget-scenarios") || "[]");
    list.innerHTML = scenarios.length ? scenarios.map((scenario) => `<button class="scenario-item w-full text-left p-2 rounded-lg bg-base-200 hover:bg-base-300" data-id="${scenario.id}"><span class="font-medium">$${scenario.values["monthly-income"].toLocaleString()} income</span><span class="float-right ${scenario.remaining >= 0 ? "text-success" : "text-error"}">$${scenario.remaining.toLocaleString()} left</span></button>`).join("") : '<p class="text-neutral/50">Save a calculation to compare it later.</p>';
    list.querySelectorAll(".scenario-item").forEach((button) => button.addEventListener("click", () => {
      const scenario = scenarios.find((item) => item.id === Number(button.dataset.id));
      if (!scenario) return;
      fields.forEach((id) => { document.getElementById(id).value = scenario.values[id] || ""; });
      this.calculateBudget();
    }));
  }
}
document.addEventListener("DOMContentLoaded", () => new BudgetCalculator());

import { displayError, updateBalanceDisplay } from "../dom.js";
import { SessionManager } from "../bankservice.js";

class CurrencyConverter {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    const session = SessionManager.getSession();
    this.user = session.user;

    this.rates = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      BDT: 109.5,
      INR: 83.12,
      JPY: 149.5,
    };
    this.isLoading = false;

    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);
    document.getElementById("convert-btn").addEventListener("click", () => {
      this.convert();
    });
    this.addConverterTools();
  }

  async loadRates() {
    if (this.isLoading) return this.rates;

    this.isLoading = true;

    try {
      const response = await fetch(
        "https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP,BDT,INR,JPY",
      );
      const data = await response.json();

      if (data && data.success && data.rates) {
        this.rates = {
          ...this.rates,
          ...Object.fromEntries(
            Object.entries(data.rates).map(([key, value]) => [
              key,
              Number(value),
            ]),
          ),
        };
      }
    } catch (error) {
      console.warn("Using fallback rates:", error);
    } finally {
      this.isLoading = false;
    }

    return this.rates;
  }

  async convert() {
    const amount =
      parseFloat(document.getElementById("convert-amount").value) || 0;
    const from = document.getElementById("from-currency").value;
    const to = document.getElementById("to-currency").value;

    if (amount <= 0) {
      displayError("Please enter a valid amount");
      return;
    }

    const rates = await this.loadRates();
    const fromRate = rates[from] ?? 1;
    const toRate = rates[to] ?? 1;

    if (!fromRate || !toRate) {
      displayError("Unable to load conversion rates right now");
      return;
    }

    const inUSD = amount / fromRate;
    const result = inUSD * toRate;

    const resultDiv = document.getElementById("conversion-result");
    const resultDisplay = document.getElementById("result-display");

    resultDiv.classList.remove("hidden");
    resultDisplay.textContent = `${result.toFixed(2)} ${to}`;
    this.saveConversion({ amount, from, to, result });
  }

  addConverterTools() {
    const from = document.getElementById("from-currency");
    const to = document.getElementById("to-currency");
    const button = document.createElement("button");
    button.className = "btn btn-ghost btn-sm btn-circle self-end";
    button.title = "Swap currencies";
    button.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i>';
    to.parentElement.before(button);
    button.addEventListener("click", () => { const value = from.value; from.value = to.value; to.value = value; });
    const history = document.createElement("div");
    history.className = "card bg-base-100 shadow rounded-2xl mt-4";
    history.innerHTML = '<div class="card-body"><h3 class="font-bold">Recent conversions</h3><div id="conversion-history" class="space-y-2 text-sm"></div></div>';
    document.getElementById("conversion-result").parentElement.append(history);
    this.renderHistory();
  }

  saveConversion(item) {
    const history = JSON.parse(localStorage.getItem("payoo:conversion-history") || "[]");
    history.unshift({ ...item, time: Date.now() });
    localStorage.setItem("payoo:conversion-history", JSON.stringify(history.slice(0, 5)));
    this.renderHistory();
  }

  renderHistory() {
    const container = document.getElementById("conversion-history");
    if (!container) return;
    const history = JSON.parse(localStorage.getItem("payoo:conversion-history") || "[]");
    container.innerHTML = history.length ? history.map((item) => `<div class="flex justify-between bg-base-200 rounded-lg p-2"><span>${item.amount} ${item.from}</span><span class="font-semibold">${Number(item.result).toFixed(2)} ${item.to}</span></div>`).join("") : '<p class="text-neutral/50">Your conversions will appear here.</p>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CurrencyConverter();
});

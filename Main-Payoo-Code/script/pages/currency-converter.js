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
    document.getElementById("convert-btn").addEventListener("click", () => {
      this.convert();
    });
  }

  init() {
    updateBalanceDisplay(this.user.balance);

    document.getElementById("convert-btn").addEventListener("click", () => {
      this.convert();
    });
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
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CurrencyConverter();
});

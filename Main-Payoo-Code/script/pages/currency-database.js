import { updateBalanceDisplay } from "../dom.js";
import { SessionManager } from "../bankservice.js";

class CurrencyDatabase {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    const session = SessionManager.getSession();
    this.user = session.user;
    this.currencies = [];

    this.init();
  }

  async init() {
    updateBalanceDisplay(this.user.balance);

    await this.loadCurrencies();
    this.renderCurrencies(this.currencies);

    let searchTimer;
    document
      .getElementById("currency-search")
      .addEventListener("input", (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
        const search = e.target.value.toLowerCase();
        const filtered = this.currencies.filter(
          (c) =>
            c.name.toLowerCase().includes(search) ||
            c.code.toLowerCase().includes(search),
        );
        this.renderCurrencies(filtered);
        }, 200);
      });
  }

  async loadCurrencies() {
    try {
      const response = await fetch("data/data.json");
      if (!response.ok) {
        throw new Error(`Failed to load currency data: ${response.status}`);
      }

      const rawData = await response.json();
      this.currencies = Object.entries(rawData).map(([code, data]) => ({
        code,
        name: data.name,
        symbol: data.symbol,
        rate: data.rate ?? "N/A",
      }));

      this.currencies.sort((a, b) => a.code.localeCompare(b.code));
    } catch (error) {
      console.error(error);
      this.currencies = [
        { code: "USD", name: "US Dollar", symbol: "$", rate: 1 },
      ];
    }
  }

  renderCurrencies(currencies) {
    const container = document.getElementById("currency-list");

    container.innerHTML = currencies
      .map(
        (currency) => `
      <div class="currency-row flex justify-between items-center p-3 bg-base-100 rounded-xl shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center font-bold">
            ${currency.code.slice(0, 2)}
          </div>
          <div>
            <p class="font-medium text-sm">${currency.name}</p>
            <p class="text-xs text-neutral/50">${currency.code}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold">${currency.symbol}</p>
          <p class="text-xs text-neutral/50">Rate: ${currency.rate}</p>
        </div>
      </div>
    `,
      )
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CurrencyDatabase();
});

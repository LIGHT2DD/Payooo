class CurrencyDatabase {
  constructor() {
    this.currencies = [
      { code: "USD", name: "US Dollar", symbol: "$", rate: 1 },
      { code: "EUR", name: "Euro", symbol: "€", rate: 0.92 },
      { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79 },
      { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", rate: 109.5 },
      { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.12 },
      { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 149.5 },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.35 },
      { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.53 },
      { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.24 },
      { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75 },
    ];

    this.init();
  }

  init() {
    this.renderCurrencies(this.currencies);

    document.getElementById("currency-search").addEventListener("input", (e) => {
      const search = e.target.value.toLowerCase();
      const filtered = this.currencies.filter(c => 
        c.name.toLowerCase().includes(search) || 
        c.code.toLowerCase().includes(search)
      );
      this.renderCurrencies(filtered);
    });
  }

  renderCurrencies(currencies) {
    const container = document.getElementById("currency-list");
    
    container.innerHTML = currencies.map(currency => `
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
    `).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CurrencyDatabase();
});
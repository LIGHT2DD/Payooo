/** Loads Chart.js only when a dashboard chart is actually requested. */

let chartLoader;

export function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (chartLoader) return chartLoader;

  chartLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";
    script.async = true;
    script.onload = () => resolve(window.Chart);
    script.onerror = () => reject(new Error("Chart.js could not be loaded."));
    document.head.append(script);
  });
  return chartLoader;
}

function isIncoming(transaction) {
  return ["deposit", "bonus"].includes(transaction.type);
}

function isOutgoing(transaction) {
  return ["withdrawal", "transfer", "payment", "donation", "savings"].includes(transaction.type);
}

export function buildDashboardData(transactions = [], balance = 0) {
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    return date;
  });
  const dailyNet = days.map(() => 0);
  const categories = {
    Cashout: 0,
    "Send money": 0,
    "Bill payment": 0,
    Other: 0,
  };

  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.date);
    const index = days.findIndex(
      (day) => day.toDateString() === transactionDate.toDateString(),
    );
    const amount = Number(transaction.amount || 0);
    if (index !== -1)
      dailyNet[index] += isIncoming(transaction) ? amount : -amount;
    if (!isIncoming(transaction)) {
      const category =
        transaction.type === "withdrawal"
          ? "Cashout"
          : transaction.type === "transfer"
            ? "Send money"
            : transaction.type === "payment"
              ? "Bill payment"
              : "Other";
      categories[category] += amount;
    }
  });

  const openingBalance =
    Number(balance || 0) - dailyNet.reduce((sum, value) => sum + value, 0);
  let runningBalance = openingBalance;
  const balanceSeries = dailyNet.map((net) => (runningBalance += net));

  return {
    labels: days.map((day) =>
      day.toLocaleDateString("en-US", { weekday: "short" }),
    ),
    balanceSeries,
    categories: Object.entries(categories).filter(([, amount]) => amount > 0),
    incoming: transactions
      .filter(isIncoming)
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    outgoing: transactions
      .filter((tx) => !isIncoming(tx))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
  };
}

export async function renderDashboardCharts({
  balanceCanvas,
  spendingCanvas,
  transactions,
  balance,
}) {
  if (!balanceCanvas || !spendingCanvas) return;
  const Chart = await loadChartJs();
  const data = buildDashboardData(transactions, balance);
  const rootStyle = getComputedStyle(document.documentElement);
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const textColor =
    theme === "dark"
      ? rootStyle.getPropertyValue("--slate-300").trim() || "#cbd5e1"
      : rootStyle.getPropertyValue("--slate-600").trim() || "#64748b";
  const gridColor =
    theme === "dark"
      ? "rgba(148, 163, 184, 0.18)"
      : "rgba(100, 116, 139, 0.12)";

  balanceCanvas._payooChart?.destroy();
  spendingCanvas._payooChart?.destroy();

  const chartGradient = balanceCanvas
    .getContext("2d")
    ?.createLinearGradient(0, 0, 0, 220);
  if (chartGradient) {
    chartGradient.addColorStop(
      0,
      theme === "dark"
        ? "rgba(167, 139, 250, 0.38)"
        : "rgba(116, 96, 255, 0.24)",
    );
    chartGradient.addColorStop(
      1,
      theme === "dark"
        ? "rgba(116, 96, 255, 0.02)"
        : "rgba(116, 96, 255, 0.01)",
    );
  }

  balanceCanvas._payooChart = new Chart(balanceCanvas, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "Balance",
          data: data.balanceSeries,
          borderColor: theme === "dark" ? "#34d399" : "#059669",
          backgroundColor: chartGradient || "rgba(5, 150, 105, 0.14)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: theme === "dark" ? "#6ee7b7" : "#10b981",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor },
        },
        x: {
          ticks: { color: textColor },
          grid: { display: false },
        },
      },
    },
  });

  const categories = data.categories.length
    ? data.categories
    : [["No spending yet", 1]];
  spendingCanvas._payooChart = new Chart(spendingCanvas, {
    type: "doughnut",
    data: {
      labels: categories.map(([label]) => label),
      datasets: [
        {
          data: categories.map(([, amount]) => amount),
          backgroundColor:
            categories.length === 1 && categories[0][0] === "No spending yet"
              ? [theme === "dark" ? "#475569" : "#cbd5e1"]
              : ["#7460ff", "#a78bfa", "#8b5cf6", "#c4b5fd"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, color: textColor },
        },
      },
    },
  });

  return data;
}

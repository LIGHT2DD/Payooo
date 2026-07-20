import { displaySuccess, displayError, updateBalanceDisplay } from "../dom.js";
import { SessionManager } from "../bankservice.js";

class QRScanner {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    const session = SessionManager.getSession();
    this.user = session.user;
    this.scanner = null;
    this.history = JSON.parse(localStorage.getItem("payoo:scan-history") || "[]");
    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);

    document.getElementById("start-scan-btn").addEventListener("click", () => {
      this.startScanner();
    });

    document.getElementById("qr-text-input").addEventListener("input", (e) => {
      this.displayResult(e.target.value);
    });
    this.addHistoryPanel();
    this.renderHistory();
  }

  startScanner() {
    // Check if browser supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      displayError("Camera not supported in this browser");
      return;
    }

    const qrReader = document.getElementById("qr-reader");

    // Request camera access
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();

        qrReader.innerHTML = "";
        qrReader.appendChild(video);

        displaySuccess("Camera started! Scan a QR code");

        // Stop camera after 30 seconds
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          qrReader.innerHTML = `
            <div class="text-center">
              <i class="fa-solid fa-qrcode text-6xl text-neutral/30 mb-4"></i>
              <p class="text-neutral/50">Camera timed out</p>
            </div>
          `;
        }, 30000);
      })
      .catch((err) => {
        displayError("Cannot access camera: " + err.message);
      });
  }

  displayResult(text) {
    if (!text) return;

    const resultDiv = document.getElementById("scan-result");
    const resultText = document.getElementById("result-text");

    resultDiv.classList.remove("hidden");
    resultText.textContent = text;
    this.history = [{ text, date: new Date().toISOString() }, ...this.history.filter((item) => item.text !== text)].slice(0, 8);
    localStorage.setItem("payoo:scan-history", JSON.stringify(this.history));
    this.renderHistory();
  }

  addHistoryPanel() {
    const result = document.getElementById("scan-result");
    if (!result || document.getElementById("scan-history")) return;
    const panel = document.createElement("div");
    panel.id = "scan-history";
    panel.className = "card bg-base-100 shadow rounded-2xl";
    panel.innerHTML = '<div class="card-body"><div class="flex justify-between"><h3 class="font-bold">Scan history</h3><button id="clear-scan-history" class="btn btn-ghost btn-xs">Clear</button></div><div id="scan-history-list" class="space-y-2 text-sm"></div></div>';
    result.after(panel);
    panel.querySelector("#clear-scan-history").addEventListener("click", () => { this.history = []; localStorage.removeItem("payoo:scan-history"); this.renderHistory(); });
  }

  renderHistory() {
    const list = document.getElementById("scan-history-list");
    if (!list) return;
    list.innerHTML = this.history.length ? this.history.map((item, index) => `<button class="history-scan block w-full text-left p-2 rounded-lg bg-base-200 truncate" data-index="${index}">${this.escape(item.text)} <span class="float-right text-xs text-neutral/50">${new Date(item.date).toLocaleDateString()}</span></button>`).join("") : '<div class="text-center py-5 text-neutral/50"><i class="fa-solid fa-qrcode text-2xl opacity-40"></i><p class="mt-2">No scans saved yet.</p><p class="text-xs mt-1">Scan a code or paste text above to build your history.</p></div>';
    list.querySelectorAll(".history-scan").forEach((button) => button.addEventListener("click", () => this.displayResult(this.history[Number(button.dataset.index)].text)));
  }

  escape(value) { const el = document.createElement("div"); el.textContent = value; return el.innerHTML; }
}

document.addEventListener("DOMContentLoaded", () => {
  new QRScanner();
});
